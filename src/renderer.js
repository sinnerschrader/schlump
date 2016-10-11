const vm = require('vm');
const path = require('path');
const sander = require('sander');
const React = require('react');
const ReactDOM = require('react-dom/server');
const matter = require('gray-matter');
const chalk = require('chalk');
const figures = require('figures');

const {transformJsx} = require('./jsx');

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
