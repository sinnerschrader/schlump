const vm = require('vm');
const path = require('path');
const sander = require('sander');
const React = require('react');
const ReactDOM = require('react-dom/server');
const matter = require('gray-matter');
const chalk = require('chalk');
const figures = require('figures');

const {transformJsx, evaluateHelpers} = require('./jsx');
const {validatePages} = require('./validator');

module.exports = {
	renderPages
};

function getDestinationPath(filepath, dest) {
	let destinationpath = path.join(dest, filepath.replace(/src\/pages/, ''));
	if (!path.extname(destinationpath)) {
		destinationpath += '/index.html';
	}
	return destinationpath;
}

/**
 * Renders all given pages as static HTML into the destination folder.
 *
 * @param {string[]} filepaths
 * @param {any} components
 * @param {string} dest
 * @param {any} vars key-value pairs of globals
 * @returns
 */
function renderPages(filepaths, components, dest, vars) {
	console.log(`\nGenerating pages...`);
	return Promise.all(filepaths.map(filepath => {
		let destinationPath;
		return sander.readFile(filepath)
			.then(content => {
				const parsed = matter(content.toString());
				destinationPath = getDestinationPath(parsed.data.route || filepath, dest);
				const {helpers, statement} = transformJsx(parsed.content);
				const sandbox = Object.assign(
					{},
					components,
					evaluateHelpers(helpers),
					{
						global: vars,
						frontmatter: parsed.data,
						React,
						__html__: undefined
					}
				);
				const opts = {
					filename: filepath,
					displayErrors: true
				};
				vm.runInNewContext('__html__ = ' + statement, sandbox, opts);
				return '<!DOCTYPE html>' + ReactDOM.renderToStaticMarkup(sandbox.__html__);
			})
			.then(html => sander.writeFile(destinationPath, html))
			.then(() => console.log(`  ${chalk.bold.green(figures.tick)} ${filepath} -> ${destinationPath}`))
			.then(() => destinationPath);
	}))
	.then(files => validatePages(dest, files));
}
