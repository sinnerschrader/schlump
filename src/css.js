const camelcase = require('camelcase');
const css = require('css');
const decamelize = require('decamelize');

module.exports = {
	createScopedCss,
	combineCss,
	getMarkup
};

// https://regex101.com/r/EFULGo/2
const styleMatcher = /<style(?:.+)scoped(?:.*)>((?:.|[\r\n])*?)<\/style>/i;

/**
 * Returns the markup part of the combined css and html source.
 *
 * @param {string} code Source to extract markup from
 * @returns {string} Markup of the given source
 */
function getMarkup(code) {
	return code.replace(styleMatcher, '').trim();
}

/**
 * Strips scoped style from html and return html and metadata.
 *
 * @param {string} html HTML input source
 * @param {Object|string} scope Namespace for generated classNames
 * @param {string?} filepath Input file path (mainly for debugging)
 * @param {boolean} cssVariables True if css-variables support should be enabled
 * @returns [html: string, CSSOM: {classNames: any, vars: any}, css: string]
 */
function createScopedCss(html, scope, filepath, cssVariables) {
	scope = typeof scope === 'string' ? {ns: scope, vars: new Map()} : scope;

	const style = html.match(styleMatcher);
	if (!style) {
		return [{}, scope.vars, ''];
	}
	const cssom = css.parse(style[1], {source: filepath});
	const vars = new Map(scope.vars.entries());
	getVariables(cssom).forEach((value, key) => vars.set(key, value));

	if (cssVariables) {
		resolveScopeVariables(cssom, vars);
	}
	const hash = createHash(css.stringify(cssom));
	const classNames = getClassNames(`${scope.ns}-${hash}`, cssom);

	return [classNames, vars, css.stringify(cssom)];
}

function createHash(input) {
	let hash = 0;
	if (input.length === 0) {
		return hash;
	}
	for (let i = 0; i < input.length; i++) {
		const char = input.charCodeAt(i);
		hash = ((hash << 5) - hash) + char;
		// Convert to 32bit integer
		hash &= hash;
	}
	return hash;
}

/**
 * Returns a combined CSS from all component CSS and scopedCss.
 *
 * @param {object} templates A map of schlump templates
 * @param {string[]} scopedCss A list of page CSS
 * @returns {string} CSS result
 */
function combineCss(templates, scopedCss) {
	if (!Array.isArray(scopedCss)) {
		scopedCss = [scopedCss];
	}
	return [
		...Object.keys(templates).map(name => templates[name].css),
		...scopedCss
	]
	.join('\n').trim();
}

const toScopedClassName = (ns, selector) => `${decamelize(ns, '-')}-${decamelize(camelcase(selector), '-')}`;

function getClassNames(ns, cssom) {
	return cssom.stylesheet.rules
		.filter(rule => rule.type === 'rule')
		.reduce((rules, rule) => {
			rules = [...rules, ...rule.selectors];
			rule.selectors = rule.selectors.map(selector => `.${toScopedClassName(ns, selector)}`);
			return rules;
		}, [])
		.reduce((classNames, selector) => {
			classNames[camelcase(selector)] = toScopedClassName(ns, selector);
			return classNames;
		}, {});
}

function getDeclarations(cssom) {
	return cssom.stylesheet.rules
		.filter(rule => rule.type === 'rule')
		.reduce((declarations, rule) => [...declarations, ...rule.declarations], [])
		.filter(declaration => declaration.type === 'declaration');
}

function getVariables(cssom) {
	return getDeclarations(cssom)
		.filter(declaration => declaration.property.startsWith('--'))
		.reduce((vars, declaration) => {
			vars.set(declaration.property, declaration.value);
			return vars;
		}, new Map());
}

function resolveScopeVariables(cssom, scope) {
	getDeclarations(cssom)
		.forEach(declaration => {
			scope.forEach((value, variableName) => {
				declaration.value = declaration.value.replace(`var(${variableName})`, value);
			});
		});
}
