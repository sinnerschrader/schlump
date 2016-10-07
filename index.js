const vm = require('vm');
const path = require('path');
const globby = require('globby');
const sander = require('sander');
const camelcase = require('camelcase');
const uppercaseFirst = require('upper-case-first');
const babel = require('babel-core');
const React = require('react');
const ReactDOM = require('react-dom/server');
const matter = require('gray-matter');
const requireAll = require('require-all');
const chalk = require('chalk');
const figures = require('figures');

function getDestinationPath(filepath, dest) {
	let destinationpath = path.join(dest, filepath.replace(/src\/pages/, ''));
	if (!path.extname(destinationpath)) {
		destinationpath += '/index.html';
	}
	return destinationpath;
}

function transformJsx(code) {
	const options = {
		plugins: ['transform-react-jsx']
	};
	return babel.transform(code, options).code.replace(/;?$/, '');
}

function createReactComponent(lazyComponentRegistry, helpers, filepath, code) {
	const parsed = matter(code);
	const name = parsed.data.name || uppercaseFirst(camelcase(path.basename(filepath, '.html')));
	const compCode = transformJsx(parsed.content);

	const proxyHandler = {
		/*
		 * Trap property resolution
		 */
		get: function (target, name) {
			// Check if we have a component with this name
			if (lazyComponentRegistry[name]) {
				return lazyComponentRegistry[name];
			}
			if (name === 'helpers') {
				return helpers;
			}
			return target[name];
		}
	};
	const proxyTarget = {
		React,
		name: undefined
	};

	const sandbox = new Proxy(proxyTarget, proxyHandler);
	const opts = {
		filename: filepath,
		displayErrors: true
	};
	vm.runInNewContext(`${name} = (props) => (${compCode})`, sandbox, opts);

	return {
		name,
		Component: sandbox[name]
	};
}

function loadHelpers(srcHelpers) {
	if (!sander.existsSync(srcHelpers)) {
		return {};
	}
	console.log(`Loading helpers...`);
	const plainHelpers = requireAll({
		dirname: path.resolve(srcHelpers),
		map: name => name.replace(/-([a-z])/g, (m, c) => c.toUpperCase())
	});
	const helpers = Object.keys(plainHelpers).reduce((helpers, name) => {
		if (typeof plainHelpers[name] === 'function') {
			console.log(`  ${chalk.bold.green(figures.tick)} ${name} - ok`);
			helpers[name] = plainHelpers[name];
		} else {
			console.log(`  ${chalk.bold.red(figures.cross)} ${name} - does not export a function`);
		}
		return helpers;
	}, {});
	return helpers;
}

function createReactComponents(srcTemplates, srcHelpers) {
	const helpers = loadHelpers(srcHelpers);
	// Create component object here and add all components when created to have the reference already and
	// resolve against it during runtime
	const lazyComponentRegistry = {};
	return globby([srcTemplates])
		.then(filepaths => {
			return Promise.all(filepaths.map(filepath => {
				return sander.readFile(filepath)
					.then(content =>
						createReactComponent(lazyComponentRegistry, helpers, filepath, content.toString()));
			}))
			.then(components => {
				return components.reduce((all, comp) => {
					all[comp.name] = comp.Component;
					return all;
				}, lazyComponentRegistry);
			});
		});
}

function renderPages(filepaths, components, dest) {
	console.log(`\nGenerating pages...`);
	return Promise.all(filepaths.map(filepath => {
		let destinationPath;
		return sander.readFile(filepath)
			.then(content => {
				const parsed = matter(content.toString());
				destinationPath = getDestinationPath(parsed.data.route || filepath, dest);
				const sandbox = Object.assign(
					{},
					components,
					{
						React,
						frontmatter: parsed.data,
						__html__: undefined
					}
				);
				const opts = {
					filename: filepath,
					displayErrors: true
				};
				vm.runInNewContext('__html__ = ' + transformJsx(parsed.content), sandbox, opts);
				return '<!DOCTYPE html>' + ReactDOM.renderToStaticMarkup(sandbox.__html__);
			})
			.then(html => sander.writeFile(destinationPath, html))
			.then(() => console.log(`  ${chalk.bold.green(figures.tick)} ${filepath} -> ${destinationPath}`));
	}));
}

function logError(err) {
	console.error(`\n${chalk.bold.red('FAILED')}\n`);
	console.error(err);
	throw err;
}

function build(opts) {
	const {srcPages, srcTemplates, srcStatics, srcHelpers, dest, destStatics} = opts;
	return sander.copydir(path.join(process.cwd(), srcStatics)).to(path.join(process.cwd(), destStatics))
		.catch(() => {/* just ignore missing statics folder */})
		.then(() => createReactComponents(srcTemplates, srcHelpers))
		.then(components =>
			globby([srcPages])
				.then(filepaths => renderPages(filepaths, components, dest))
		.then(() => console.log(`\n${chalk.bold.green('SUCCESS')}\n`)))
		.catch(err => logError(err));
}

module.exports = {
	build
};
