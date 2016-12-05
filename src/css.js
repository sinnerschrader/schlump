const camelcase = require('camelcase');
const css = require('css');
const decamelize = require('decamelize');
const selectorParser = require('postcss-selector-parser');

const {getMatchingSelectors} = require('./css-matcher');

module.exports = {
	createScopedCss,
	combineCss,
	getMarkup,
	getMatchingSelectors
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
 * @returns [classNames: any, vars: any, css: string, transformMap: Object]
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
	const [classes, transformMap] = rewriteSelectors(`${decamelize(scope.ns, '-')}`, cssom);

	return [classes, vars, css.stringify(cssom), transformMap];
}

// Based on http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
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

function isClassSelectorNode(selector, i) {
	return selector.nodes[i].type === selectorParser.CLASS;
}
function isClassWithAttributeSelectorNode(selector, i) {
	return selector.nodes[i].type === selectorParser.ATTRIBUTE &&
		(i === 0 || selector.nodes[i - 1].type !== selectorParser.CLASS);
}
function isSimpleClassSelector(selector) {
	return selector.nodes.length === 1 && selector.nodes[0].type === selectorParser.CLASS;
}
function isSimpleClassWithPseudoSelector(selector) {
	return selector.nodes.length === 2 && selector.nodes[0].type === selectorParser.CLASS &&
		selector.nodes[1].type === selectorParser.PSEUDO;
}
function isOnlyPseudoRootSelector(selector) {
	return selector.nodes.length === 1 && selector.first.type === selectorParser.PSEUDO &&
		selector.first.value === ':root';
}

function createHashFromRule(nsPrefix, rule) {
	const ruleBody = rule.declarations
		.map(declaration => `${declaration.property}: ${declaration.value}`)
		.join('\n');
	return `${nsPrefix}-${createHash(ruleBody)}`;
}

function selectorTransformFactory(nsPrefix) {
	const classNameCache = new Map();
	const classes = {};
	const map = {};

	return {
		classes,
		map,
		createTransform(rule) {
			const ns = createHashFromRule(nsPrefix, rule);
			return selectors => {
				selectors.each(selector => {
					const sourceSelector = String(selector);

					if (isSimpleClassSelector(selector)) {
						classes[camelcase(String(selector))] = `${ns}-${selector.nodes[0].value}`;
					} else if (isSimpleClassWithPseudoSelector(selector)) {
						classes[camelcase(String(selector.nodes[0].value))] = `${ns}-${selector.nodes[0].value}`;
					}

					if (isOnlyPseudoRootSelector(selector)) {
						selector.first.replaceWith(selectorParser.className({value: `${ns}-root`}));
						map[sourceSelector] = String(`${ns}-root`).replace(/^\./, '');
					} else {
						for (let i = 0, n = selector.nodes.length; i < n; i++) {
							if (isClassSelectorNode(selector, i)) {
								let newClass = classNameCache.get(selector.nodes[i].value);
								if (!newClass) {
									newClass = selectorParser.className({value: `${ns}-${selector.nodes[i].value}`});
									classNameCache.set(selector.nodes[i].value, newClass);
								}
								selector.nodes[i].replaceWith(newClass);
								map[sourceSelector] = String(selector.last).replace(/^\./, '');
							} else if (isClassWithAttributeSelectorNode(selector, i)) {
								const classSelector = selectorParser.className({value: ns});
								selector.insertBefore(selector.nodes[i], classSelector);
								map[sourceSelector] = String(classSelector).replace(/^\./, '');
							}
						}
						if (selector.last.type === selectorParser.TAG) {
							selector.last.replaceWith(selectorParser.className({value:
								`${ns}-${selector.last.value}`}));
							map[sourceSelector] = String(selector.last).replace(/^\./, '');
						}
					}
				});
			};
		}
	};
}

function rewriteSelectors(ns, cssom) {
	const factory = selectorTransformFactory(ns);
	cssom.stylesheet.rules
		.filter(rule => rule.type === 'rule')
		.forEach(rule => {
			const transform = factory.createTransform(rule);
			rule.selectors = rule.selectors
				.map(selector =>
					selectorParser(transform).process(selector).result);
		});
	return [factory.classes, factory.map];
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
			while (declaration.value.includes('var(')) {
				scope.forEach((value, variableName) => {
					declaration.value = declaration.value.replace(`var(${variableName})`, value);
				});
			}
		});
}
