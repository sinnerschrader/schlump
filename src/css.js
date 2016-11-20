const camelcase = require('camelcase');
const css = require('css');
const decamelize = require('decamelize');

module.exports = {
	createScopedCss,
	combineCss
};

function createScopedCss(html, name, filepath) {
	const styleMatcher = /^<style(?:.+)scoped(?:.*)>((?:.|[\r\n])*)<\/style>/i;
	const style = html.match(styleMatcher);
	html = html.replace(styleMatcher, '');
	if (!style) {
		return [html, {classNames: {}}, ''];
	}
	const className = selector => `${decamelize(name, '-')}-${decamelize(camelcase(selector), '-')}`;
	const cssom = css.parse(style[1], {source: filepath});
	cssom.classNames = cssom.stylesheet.rules
			.reduce((rules, rule) => {
				if (rule.type !== 'rule') {
					return rules;
				}
				const result = [...rules, ...rule.selectors];
				rule.selectors = rule.selectors.map(selector => `.${className(selector)}`);
				return result;
			}, [])
			.reduce((classNames, selector) => {
				classNames[camelcase(selector)] = className(selector);
				return classNames;
			}, {});
	return [html, cssom, css.stringify(cssom)];
}

function combineCss(components, scopedCss) {
	if (!Array.isArray(scopedCss)) {
		scopedCss = [scopedCss];
	}
	return [...Object.keys(components).map(name => components[name].css), ...scopedCss].join('\n').trim();
}
