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
			// Check if we have a helper function with this name
			if (name in helpers && typeof helpers[name] === 'function') {
				return helpers[name];
			}
			return target[name];
		}
	};
	const proxyTarget = {
		React,
		name: undefined
	};

	const sandbox = new Proxy(proxyTarget, proxyHandler);
	vm.runInNewContext(`${name} = (props) => (${compCode})`, sandbox);

	return {
		name,
		Component: sandbox[name]
	};
}

function loadHelpers(srcHelpers) {
	if (!sander.existsSync(srcHelpers)) {
		return {};
	}
	return requireAll({
		dirname: path.resolve(srcHelpers),
		map: name => name.replace(/-([a-z])/g, (m, c) => c.toUpperCase())
	});
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
	console.log(`Generating pages...`);
	return Promise.all(filepaths.map(filepath => {
		let destinationPath;
		return sander.readFile(filepath)
			.then(content => {
				const parsed = matter(content.toString());
				destinationPath = getDestinationPath(parsed.data.route || filepath, dest);
				console.log(`... ${filepath} -> ${destinationPath}`);
				const sandbox = Object.assign(
					{},
					components,
					{
						React,
						__html__: undefined
					}
				);
				vm.runInNewContext('__html__ = ' + transformJsx(parsed.content), sandbox);
				return '<!DOCTYPE html>' + ReactDOM.renderToStaticMarkup(sandbox.__html__);
			})
			.then(html => sander.writeFile(destinationPath, html));
	}));
}

function logError(err) {
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
		.then(() => console.log('Done.')))
		.catch(err => logError(err));
}

module.exports = {
	build
};
