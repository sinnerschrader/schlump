const vm = require('vm');
const path = require('path');
const sander = require('sander');
const React = require('react');
const ReactDOM = require('react-dom/server');
const matter = require('gray-matter');
const chalk = require('chalk');
const figures = require('figures');
const {oneLine} = require('common-tags');

const {transformJsx, evaluateHelpers} = require('./jsx');
const {validatePages} = require('./validator');
const {createScopedCss, combineCss} = require('./css');

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
function renderPages(filepaths, dest, {components, vars, statics, disableValidation}) {
	console.log(`\nGenerating pages...`);
	return Promise.all(filepaths.map(filepath => {
		return sander.readFile(filepath)
			.then(content => renderPage(content, filepath, {components, vars, dest}))
			.then(([html, destinationPath, scopedCss]) => sander.writeFile(destinationPath, html)
				.then(() => [destinationPath, scopedCss]))
			.then(([destinationPath, scopedCss]) => {
				console.log(`  ${chalk.bold.green(figures.tick)} ${filepath} -> ${destinationPath}`);
				return [destinationPath, scopedCss];
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

function renderPage(content, filepath, {components, vars, dest}) {
	const parsed = matter(content.toString());
	const destinationPath = getDestinationPath(parsed.data.route || filepath, dest);
	const pageName = filepath.replace(/[./]/g, '-').replace(/^--/, '');
	const [html, cssom, scopedCss] = createScopedCss(parsed.content, pageName, filepath);
	const {helpers, statement} = transformJsx(html);
	const sandbox = Object.assign(
		{},
		components,
		evaluateHelpers(helpers),
		{
			global: new Proxy(Object.assign({}, vars), {
				get: (target, name) => deprecatedGlobals(target, name, filepath)
			}),
			props: vars,
			frontmatter: parsed.data,
			style: cssom.classNames,
			scopedCss: combineCss(components, scopedCss),
			React,
			__html__: undefined,
			console,
			filepath,
			cssScopeStack: [new Map()]
		}
	);
	const opts = {
		filename: filepath,
		displayErrors: true
	};

	const decoratedRootComponent = `
		var DecoratedRootComponent = React.createClass({
			childContextTypes: {
				scope: React.PropTypes.any
			},
			getChildContext: function() {
				return {
					scope: {
						get: function() {
							return cssScopeStack[0];
						},
						set: function(newScope) {
							cssScopeStack.unshift(newScope);
						}
					}
				};
			},
			render() {
				console.log('render', filepath);
				return ${statement};
			}
		});
		__html__ = React.createElement(DecoratedRootComponent);
	`;

	vm.runInNewContext(decoratedRootComponent, sandbox, opts);
	return ['<!DOCTYPE html>' + ReactDOM.renderToStaticMarkup(sandbox.__html__), destinationPath, scopedCss];
}
