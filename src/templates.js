const vm = require('vm');
const path = require('path');
const globby = require('globby');
const sander = require('sander');
const camelcase = require('camelcase');
const uppercaseFirst = require('upper-case-first');
const React = require('react');
const matter = require('gray-matter');

const {createScopedCss} = require('./css');
const {loadHelpers} = require('./helpers');
const {transformJsx, evaluateHelpers} = require('./jsx');

module.exports = {
	createTemplates,
	createReactComponent
};

function createTemplates(srcTemplates, srcHelpers) {
	const helpers = loadHelpers(srcHelpers);
	// Create component object here and add all components when created to have the reference already and
	// resolve against it during runtime
	const componentRegistry = {};
	return globby([srcTemplates])
		.then(filepaths => {
			return Promise.all(filepaths.map(filepath => {
				return sander.readFile(filepath)
					.then(content =>
						createTemplate(componentRegistry, helpers, filepath, content.toString()));
			}))
			.then(components => {
				return components.reduce((all, comp) => {
					all[comp.name] = comp.Component;
					return all;
				}, componentRegistry);
			});
		});
}

function createTemplate(components, helpers, filepath, code) {
	const parsed = matter(code);
	const name = parsed.data.name || uppercaseFirst(camelcase(path.basename(filepath, '.html')));
	return createReactComponent(filepath, components, {helpers}, {name, code: parsed.content});
}

function createReactComponent(filepath, components, sandboxExtras, {name, code}) {
	const [html] = createScopedCss(code, name, filepath);
	const {helpers: jsxHelpers, statement} = transformJsx(html);
	const sandbox = setupSandbox(components, sandboxExtras, jsxHelpers, createLocalStyleFactory(code, name, filepath));
	const opts = {
		filename: filepath,
		displayErrors: true
	};
	const componentCode = `
		const SFC = (reactProps, context) => {
			const props = Object.assign({}, sandboxProps, reactProps);
			const style = getLocalStyle(context);
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

function setupSandbox(components, sandboxExtras, jsxHelpers, getLocalStyle) {
	if (sandboxExtras.props) {
		sandboxExtras.sandboxProps = sandboxExtras.props;
	}
	const proxyHandler = {
		/*
		 * Trap property resolution
		 */
		get: function (target, name) {
			// Check if we have a component with this name
			if (components[name]) {
				return components[name];
			}
			return target[name];
		}
	};
	const proxyTarget = Object.assign(
		{
			React,
			name: undefined,
			contextStackFactory,
			getLocalStyle,
			Object
		},
		sandboxExtras,
		evaluateHelpers(jsxHelpers)
	);

	return new Proxy(proxyTarget, proxyHandler);
}

function createLocalStyleFactory(htmlSource, ns, filepath) {
	return context => {
		const [, {classNames, vars}, css] = createScopedCss(htmlSource, {ns: `${ns}-${String(Math.random()).replace('.', '')}`, vars: context.scope.get()}, filepath);
		context.scope.set(vars);
		context.scope.css(css);
		return classNames;
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
		scope: React.PropTypes.any
	};
	return ContextStack;
}
