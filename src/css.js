const camelcase = require('camelcase');
const css = require('css');
const decamelize = require('decamelize');

module.exports = {
	createScopedCss,
	combineCss
};

/**
 * Strips scoped style from html and return html and metadata.
 *
 * @param {string} html HTML input source
 * @param {string} ns Namespace for generated classNames
 * @param {string?} filepath Input file path (mainly for debugging)
 * @returns [html: string, CSSOM: {classNames: any, vars: any}, css: string]
 */
function createScopedCss(html, ns, filepath) {
	// https://regex101.com/r/EFULGo/2
	const styleMatcher = /<style(?:.+)scoped(?:.*)>((?:.|[\r\n])*?)<\/style>/i;
	const style = html.match(styleMatcher);
	html = html.replace(styleMatcher, '');
	if (!style) {
		return [html, {classNames: {}}, ''];
	}
	const cssom = css.parse(style[1], {source: filepath});
	cssom.classNames = getClassNames(ns, cssom);
	cssom.vars = getVariables(cssom);
	return [html.trim(), cssom, css.stringify(cssom)];
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
			const result = [...rules, ...rule.selectors];
			rule.selectors = rule.selectors.map(selector => `.${toScopedClassName(ns, selector)}`);
			return result;
		}, [])
		.reduce((classNames, selector) => {
			classNames[camelcase(selector)] = toScopedClassName(ns, selector);
			return classNames;
		}, {});
}

function getVariables(cssom) {
	return cssom.stylesheet.rules
		.filter(rule => rule.type === 'rule')
		.reduce((declarations, rule) => [...declarations, ...rule.declarations], [])
		.filter(declaration => declaration.property.startsWith('--'))
		.reduce((vars, declaration) => {
			vars.set(declaration.property, declaration.value);
			return vars;
		}, new Map());
}
