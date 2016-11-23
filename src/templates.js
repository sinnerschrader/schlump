const vm = require('vm');
const path = require('path');
const globby = require('globby');
const sander = require('sander');
const camelcase = require('camelcase');
const uppercaseFirst = require('upper-case-first');
const React = require('react');
const matter = require('gray-matter');
const selectorParser = require('postcss-selector-parser');

const {Markdown, wrapMarkdown} = require('./markdown');
const {getMarkup, createScopedCss, getMatchingSelectors} = require('./css');
const {loadHelpers} = require('./helpers');
const {transformJsx, evaluateHelpers} = require('./jsx');

module.exports = {
	createTemplates,
	createReactComponent
};

function createTemplates(srcTemplates, srcHelpers, {cssVariables}) {
	const helpers = loadHelpers(srcHelpers);
	// Create templates object here and add all templates when created to have the reference already and
	// resolve against it during runtime
	const templateRegistry = {
		Markdown
	};
	return globby([srcTemplates])
		.then(filepaths => {
			return Promise.all(filepaths.map(filepath => {
				return sander.readFile(filepath)
					.then(content =>
						createTemplate({templates: templateRegistry, helpers, filepath, code: content.toString(), cssVariables}));
			}))
			.then(templates => {
				return templates.reduce((all, comp) => {
					all[comp.name] = comp.Component;
					return all;
				}, templateRegistry);
			});
		});
}

function createTemplate({templates, helpers, filepath, code, cssVariables}) {
	const parsed = matter(code);
	const ext = path.extname(filepath);
	const name = parsed.data.name || uppercaseFirst(camelcase(path.basename(filepath, ext)));
	if (ext === '.md') {
		parsed.content = wrapMarkdown(parsed.content);
	}
	return createReactComponent(filepath, templates, {helpers}, {name, code: parsed.content, cssVariables});
}

function createReactComponent(filepath, templates, sandboxExtras, {name, code, cssVariables}) {
	const html = getMarkup(code);
	const {helpers: jsxHelpers, statement} = transformJsx(html);
	const sandbox = setupSandbox(templates, sandboxExtras, jsxHelpers, createLocalStyleFactory(code, name, filepath, cssVariables));

	const opts = {
		filename: filepath,
		displayErrors: true
	};
	const componentCode = `
		const SFC = (reactProps, context) => {
			const props = Object.assign({}, sandboxProps, reactProps);
			const [style, mapping] = getLocalStyle(context);
			cssMapping = mapping;
			return (${statement});
		};
		SFC.contextTypes = {scope: React.PropTypes.any};
		${name} = contextStackFactory(SFC);
	`;
	vm.runInNewContext(componentCode, sandbox, opts);

	return {
		name,
		Component: sandbox[name]
	};
}

function setupSandbox(templates, sandboxExtras, jsxHelpers, getLocalStyle) {
	if (sandboxExtras.props) {
		sandboxExtras.sandboxProps = sandboxExtras.props;
	}
	const proxyTarget = Object.assign(
		{
			React,
			name: undefined,
			contextStackFactory,
			getLocalStyle,
			Object,
			console,
			cssMapping: undefined
		},
		sandboxExtras,
		evaluateHelpers(jsxHelpers)
	);
	const proxyHandler = {
		/*
		 * Trap property resolution
		 */
		get: function (target, name) {
			// Check if we have a component with this name
			if (templates[name]) {
				return templates[name];
			}
			// monkey-patch React.createElement
			if (name === 'React') {
				return new Proxy(React, {
					get: function (target, name) {
						if (name === 'createElement') {
							return customCreateElement(proxyTarget);
						}
						return target[name];
					}
				});
			}
			return target[name];
		}
	};

	return new Proxy(proxyTarget, proxyHandler);
}

function customCreateElement(sandbox) {
	const createElement = React.createElement;
	return function (...args) {
		let [tagOrComponent, props, children, ...rest] = args;
		if (typeof tagOrComponent === 'string') {
			class DomWrapper extends React.Component {
				getChildContext() {
					return {
						stack: {
							push: name => {
								this.domTree = this.domTree || [];
								this.domTree.push(name);
							},
							peek: () => {
								return [this.context.stack.peek(), this.domTree || []];
							}
						}
					};
				}
				render() {
					this.context.stack.push(tagOrComponent);
					if (sandbox.cssMapping) {
						const localStack = JSON.parse(JSON.stringify(this.context.stack.peek()));
						const matchingSelectors = getMatchingSelectors(localStack, Object.keys(sandbox.cssMapping));
						if (!props) {
							props = {};
						}
						if (!props.className) {
							props.className = '';
						}
						props.className += matchingSelectors
							.map(matchingSelector => sandbox.cssMapping[matchingSelector])
							.join(' ');
					}
					return createElement.apply(React, [tagOrComponent, props, children, ...rest]);
				}
			}
			DomWrapper.contextTypes = {
				stack: React.PropTypes.any
			};
			DomWrapper.childContextTypes = {
				stack: React.PropTypes.any
			};
			return createElement.apply(React, [DomWrapper, undefined, []]);
		}
		return createElement.apply(React, [tagOrComponent, props, children, ...rest]);
	};
}

function createLocalStyleFactory(htmlSource, ns, filepath, cssVariables) {
	return context => {
		const [classNames, vars, css, mapping] = createScopedCss(htmlSource, {ns, vars: context.scope.get()}, filepath, cssVariables);
		context.scope.set(vars);
		context.scope.css(css);
		return [classNames, mapping];
	};
}

function contextStackFactory(SFC) {
	class ContextStack extends React.Component {
		getChildContext() {
			return {
				scope: {
					get: () => {
						if (this.localScope) {
							return this.localScope;
						}
						return this.context.scope.get();
					},
					set: newScope => {
						this.localScope = newScope;
					},
					css: css => {
						this.context.scope.css(css);
					}
				},
				stack: {
					push(name) {
						this.domTree = this.domTree || [];
						this.domTree.push(name);
					},
					peek() {
						return this.domTree || [];
					}
				}
			};
		}

		render() {
			return React.createElement(SFC, this.props, this.props.children);
		}
	}
	ContextStack.contextTypes = {
		scope: React.PropTypes.any
	};
	ContextStack.childContextTypes = {
		scope: React.PropTypes.any,
		stack: React.PropTypes.any
	};
	return ContextStack;
}
