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

function createReactComponent(lazyComponentRegistry, filepath, code) {
	const parsed = matter(code);
	const name = parsed.data.name || uppercaseFirst(camelcase(path.basename(filepath, '.html')));
	const compCode = transformJsx(parsed.content);

	const sandbox = new Proxy({
		React,
		name: undefined
	}, {
		get: function (target, name) {
			if (lazyComponentRegistry[name]) {
				return lazyComponentRegistry[name];
			}
			return target[name];
		}
	});
	vm.runInNewContext(`${name} = (props) => (${compCode})`, sandbox);

	return {
		name,
		Component: sandbox[name]
	};
}

function createReactComponents(srcTemplates) {
	// Create component object here and add all components when created to have the reference already and
	// resolve against it during runtime
	const lazyComponentRegistry = {};
	return globby([srcTemplates])
		.then(filepaths => {
			return Promise.all(filepaths.map(filepath => {
				return sander.readFile(filepath)
					.then(content => createReactComponent(lazyComponentRegistry, filepath, content.toString()));
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
	const {srcPages, srcTemplates, srcStatics, dest, destStatics} = opts;
	return sander.copydir(path.join(process.cwd(), srcStatics)).to(path.join(process.cwd(), destStatics))
		.catch(() => {/* just ignore missing statics folder */})
		.then(() => createReactComponents(srcTemplates))
		.then(components =>
			globby([srcPages])
				.then(filepaths => renderPages(filepaths, components, dest))
		.then(() => console.log('Done.')))
		.catch(err => logError(err));
}

module.exports = {
	build
};
