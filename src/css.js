const camelcase = require('camelcase');
const css = require('css');
const decamelize = require('decamelize');
const selectorParser = require('postcss-selector-parser');

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
	const ns = `${decamelize(scope.ns, '-')}-${hash}`;
	const classNames = getClassNames(ns, cssom);
	const transformMap = rewriteSelectors(ns, cssom);

	return [classNames, vars, css.stringify(cssom), transformMap];
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

function getClassNames(ns, cssom) {
	return cssom.stylesheet.rules
		.filter(rule => rule.type === 'rule')
		.reduce((selectors, rule) => [...selectors, ...rule.selectors], [])
		.reduce((classNames, selector) => {
			const transform = selectors => {
				selectors.each(selector => {
					if (selector.nodes.length === 1 && selector.nodes[0].type === selectorParser.CLASS) {
						classNames[camelcase(String(selector))] = `${ns}-${selector.nodes[0].value}`;
					}
				});
			};
			selectorParser(transform).process(selector);
			return classNames;
		}, {});
}

function getMatchingSelectors(domStack, selectors) {
	const localStack = JSON.parse(JSON.stringify(domStack));
	const getSiblings = () => localStack.length > 0 && Array.isArray(localStack[0]) ?
		localStack : [, localStack]; // eslint-disable-line no-sparse-arrays
	const [, siblings] = getSiblings();
	const getCurrentNode = () => siblings[siblings.length - 1];

	const matchingSelectors = [];

	const isCombinatorMatching = node => {
		switch (node.value) {
			case '+':
				siblings.pop();
				return true;
			default:
				return false;
		}
	};

	const isTypeMatching = node => {
		switch (node.type) {
			case selectorParser.TAG:
				return node.value === getCurrentNode();
			case selectorParser.COMBINATOR:
				return isCombinatorMatching(node);
			default:
				return false;
		}
	};

	const transform = fullSelector => {
		return selectors => {
			selectors.each(selector => {
				let matching = true;
				for (let i = selector.nodes.length; i > 0; i--) {
					matching = isTypeMatching(selector.nodes[i - 1]);
				}
				if (matching) {
					matchingSelectors.push(fullSelector);
				}
			});
		};
	};

	selectors.forEach(selector => {
		selectorParser(transform(selector)).process(selector);
	});

	return matchingSelectors;
}

function selectorTransform(ns) {
	const map = {};
	return {
		map,
		fn: selectors => {
			selectors.each(selector => {
				const sourceSelector = String(selector);
				for (let i = 0, n = selector.nodes.length; i < n; i++) {
					if (selector.nodes[i].type === selectorParser.CLASS) {
						selector.nodes[i].replaceWith(selectorParser.className({value:
							`${ns}-${selector.nodes[i].value}`}));
					}
				}
				if (selector.last.type === selectorParser.TAG) {
					selector.last.replaceWith(selectorParser.className({value:
						`${ns}-${selector.last.value}`}));
				}
				map[sourceSelector] = String(selector.last).replace(/^\./, '');
			});
		}
	};
}

function rewriteSelectors(ns, cssom) {
	const transform = selectorTransform(ns);
	cssom.stylesheet.rules
		.filter(rule => rule.type === 'rule')
		.forEach(rule => {
			rule.selectors = rule.selectors
				.map(selector =>
					selectorParser(transform.fn).process(selector).result);
		});
	return transform.map;
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
