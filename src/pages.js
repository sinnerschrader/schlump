const vm = require('vm');
const path = require('path');
const sander = require('sander');
const React = require('react');
const ReactDOM = require('react-dom/server');
const matter = require('gray-matter');
const chalk = require('chalk');
const figures = require('figures');
const {oneLine} = require('common-tags');
const camelcase = require('camelcase');
const uppercaseFirst = require('upper-case-first');

const {validatePages} = require('./validator');
const {createReactComponent} = require('./templates');

module.exports = {
	renderPages,
	getDestinationPath
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
 * @param {string[]} filepaths Input files to generate
 * @param {string} dest Path to write files to
 * @param {any} {components, vars, statics, disableValidation, scopedCss}
 *                 components
 *                 vars key-value pairs of globals
 *                 statics list of all available static files
 *                 disableValidation true to disable sanity checks
 * @returns
 */
function renderPages(filepaths, dest, {templates, vars, statics, disableValidation, cssVariables}) {
	console.log(`\nGenerating pages...`);
	return Promise.all(filepaths.map(filepath => {
		return sander.readFile(filepath)
			.then(content => renderPage(content, filepath, {templates, vars, dest, cssVariables}))
			.then(([html, destinationPath, cssParts]) => sander.writeFile(destinationPath, html)
				.then(() => [destinationPath, cssParts]))
			.then(([destinationPath, cssParts]) => {
				console.log(`  ${chalk.bold.green(figures.tick)} ${filepath} -> ${destinationPath}`);
				return [destinationPath, cssParts];
			});
	}))
	.then(pageResults => disableValidation ||
		validatePages(dest, pageResults.map(result => result[0]), statics)
			.then(() => pageResults.map(result => result[1])));
}

function deprecatedGlobals(target, name, filepath) {
	console.warn('  ' + oneLine`${chalk.bold.red(figures.warning)} Use of ${chalk.bold(`global.${name}`)}
		in page ${filepath} is deprecated. Use ${chalk.bold(`props.${name}`)} instead.`);
	return target[name];
}

function renderPage(content, filepath, {templates, vars, dest, cssVariables}) {
	const parsed = matter(content.toString());
	const destinationPath = getDestinationPath(parsed.data.route || filepath, dest);
	const pageComponent = createPageComponent({vars, filepath, parsed, templates, cssVariables});
	const cssParts = [];
	const sandbox = Object.assign(
		{},
		templates,
		{
			React,
			__html__: undefined,
			DecoratedRootComponent: createDecoratedRootComponent(pageComponent, new Map(), cssParts)
		}
	);
	const opts = {
		filename: filepath,
		displayErrors: true
	};

	vm.runInNewContext('__html__ = React.createElement(DecoratedRootComponent);', sandbox, opts);
	return [`<!DOCTYPE html>${ReactDOM.renderToStaticMarkup(sandbox.__html__)}`, destinationPath, cssParts.join('\n')];
}

function createPageComponent({vars, filepath, parsed, templates, cssVariables}) {
	const pageName = filepath.replace(/[./]/g, '-').replace(/^--/, '');
	// TODO: Add helpers here
	const pageComponentSandbox = {
		global: new Proxy(Object.assign({}, vars), {
			get: (target, name) => deprecatedGlobals(target, name, filepath)
		}),
		props: vars,
		frontmatter: parsed.data
	};
	return createReactComponent(filepath, templates, pageComponentSandbox,
		{name: uppercaseFirst(camelcase(pageName)), code: parsed.content, cssVariables}).Component;
}

function createDecoratedRootComponent(Page, cssScope, cssParts) {
	class DecoratedRootComponent extends React.Component {
		getChildContext() {
			return {
				scope: {
					get: function () {
						return cssScope;
					},
					set: function (newScope) {
						cssScope = newScope;
					},
					css: css => {
						cssParts.push(css);
					}
				}
			};
		}

		render() {
			return React.createElement(Page);
		}
	}
	DecoratedRootComponent.childContextTypes = {
		scope: React.PropTypes.any
	};
	return DecoratedRootComponent;
}
