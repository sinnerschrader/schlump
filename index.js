#!/usr/bin/env node
const vm = require('vm');
const path = require('path');
const globby = require('globby');
const sander = require('sander');
const camelcase = require('camelcase');
const uppercaseFirst = require('upper-case-first');
const babel = require('babel-core');
const React = require('react');
const ReactDOM = require('react-dom/server');
const semver = require('semver');
const matter = require('gray-matter');
const meow = require('meow');

if (!semver.satisfies(process.version, '>=6')) {
	console.error('At least node 6 is required');
	process.exit(1); // eslint-disable-line xo/no-process-exit
}

const cli = meow(`
	Usage
		$ schlump

	Options

		--help           Usage information
		--src            Source folder (defaults to src)
		--src-pages      Folder to look for pages (default to <src>/pages)
		--src-templates  Folder to look for templates (defaults to <src>/templates)
		--src-statics    Folder to look for static files (defaults to <src>/statics)
		--dest           Destination folder (defaults to dist)
		--dest-statics    Folder to write statics (defaults to <dest>/statics)
`, {});
if (cli.flags.help) {
	cli.showHelp();
	process.exit(0); // eslint-disable-line xo/no-process-exit
}

const src = cli.flags.src || 'src';
const srcPages = (cli.flags.srcPages || `${src}/pages`) + '/**/*.html';
const srcTemplates = (cli.flags.srcTemplates || `${src}/templates`) + '/**/*.html';
const srcStatics = cli.flags.srcStatics || `${src}/statics`;
const dest = cli.flags.dest || 'dist';
const destStatics = cli.flags.destStatics || `${dest}/statics`;

function getDestinationPath(filepath) {
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

function createReactComponents() {
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

function renderPages(filepaths, components) {
	console.log(`Generating pages...`);
	return Promise.all(filepaths.map(filepath => {
		console.log(`... ${filepath}`);
		let meta;
		return sander.readFile(filepath)
			.then(content => {
				const parsed = matter(content.toString());
				meta = parsed.data;
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
			.then(html => sander.writeFile(getDestinationPath(meta.route || filepath), html));
	}));
}

function logError(err) {
	console.error(err);
	throw err;
}

console.log('a', srcPages);

sander.copydir(path.join(process.cwd(), srcStatics)).to(path.join(process.cwd(), destStatics))
	.then(() => createReactComponents())
	.then(components =>
		globby([srcPages])
			.then(filepaths => renderPages(filepaths, components))
	.then(() => console.log('Done.')))
	.catch(err => logError(err));
