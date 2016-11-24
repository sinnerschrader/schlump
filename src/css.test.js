const test = require('ava');
const {stripIndent} = require('common-tags');

const {getMarkup, createScopedCss, getMatchingSelectors} = require('./css');

test('createScopedCss should handle the first scoped style block', t => {
	const input = stripIndent`
		<style scoped>
			/* block 1 */
		</style>
		<style scoped>
			/* block 2 */
		</style>
	`;
	const expected = stripIndent`
		<style scoped>
			/* block 2 */
		</style>
	`;

	const actual = getMarkup(input);

	t.is(actual, expected);
});

test('createScopedCss should handle only scoped style block', t => {
	const input = stripIndent`
		<style>
			/* block 1 */
		</style>
		<style scoped>
			/* block 2 */
		</style>
	`;
	const expected = stripIndent`
		<style>
			/* block 1 */
		</style>
	`;

	const actual = getMarkup(input, 'name', 'file');

	t.is(actual, expected);
});

test('createScopedCss should add scoped variables to the CSSOM', t => {
	const input = stripIndent`
		<style scoped>
			.selector {
				--first-variable: red;
				--second-variable: 48px;
				color: var(--first-variable);
			}
		</style>
	`;
	const expected = new Map([
		['--first-variable', 'red'],
		['--second-variable', '48px']
	]);

	const [, actual] = createScopedCss(input, 'name', 'file');

	t.deepEqual(actual, expected);
});

test('createScopedCss should replace CSS vars with values from given scope', t => {
	const input = stripIndent`
		<style scoped>
			.selector {
				--first-variable: red;
				color: var(--first-variable);
				background-color: var(--second-variable);
			}
		</style>
	`;
	const expected = stripIndent`
		.name-962618004-selector {
		  --first-variable: red;
		  color: red;
		  background-color: blue;
		}
	`;

	const vars = new Map([['--second-variable', 'blue']]);
	const [,, actual] = createScopedCss(input, {ns: 'name', vars}, 'file', true);

	t.deepEqual(actual, expected);
});

test('createScopedCss should return locally scoped css vars', t => {
	const inputHtml = `
		<style scoped>
			.selector {
				--first-variable: red;
				--second-variable: blue;
			}
		</style>
	`;
	const inputScope = {
		ns: 'ns',
		vars: new Map([
			['--second-variable', 'green'],
			['--third-variable', 'yellow']
		])
	};
	const expected = new Map([
		['--first-variable', 'red'],
		['--second-variable', 'blue'],
		['--third-variable', 'yellow']
	]);

	const [, actual] = createScopedCss(inputHtml, inputScope, 'file');

	t.deepEqual(actual, expected);
});

test('createScopedCss should handle comments gracefully', t => {
	const inputHtml = `
		<style scoped>
			/* rule comment */
			.selector {
				/* declaration comment */
				declaration: 'value';
			}
		</style>
	`;

	t.notThrows(() => createScopedCss(inputHtml, {ns: 'ns', vars: new Map()}, 'file'));
});

test('createScopedCss should replace simple CSS selectors with a prefixed-hashed one', t => {
	const input = stripIndent`
		<style scoped>
			.selector {
				declaration: value;
			}
		</style>
	`;
	const expected = stripIndent`
	.name--1044404709-selector {
	  declaration: value;
	}
	`;

	const [,, actual] = createScopedCss(input, {ns: 'name', vars: new Map()}, 'file', true);

	t.deepEqual(actual, expected);
});

test('createScopedCss should return a selector mapping for simple CSS selectors', t => {
	const input = stripIndent`
		<style scoped>
			.selector {
				declaration: value;
			}
		</style>
	`;
	const expected = {
		selector: 'name--1044404709-selector'
	};
	const expectedMapping = {
		'.selector': 'name--1044404709-selector'
	};

	const [actual,,, mapping] = createScopedCss(input, {ns: 'name', vars: new Map()}, 'file', true);

	t.deepEqual(actual, expected);
	t.deepEqual(mapping, expectedMapping);
});

test('createScopedCss should replace descendant CSS selectors with a prefixed-hashed one', t => {
	const input = stripIndent`
		<style scoped>
			.selector descendant {
				declaration: value;
			}
		</style>
	`;
	const expected = stripIndent`
	.name--571293890-selector .name--571293890-descendant {
	  declaration: value;
	}
	`;

	const [,, actual] = createScopedCss(input, {ns: 'name', vars: new Map()}, 'file', true);

	t.deepEqual(actual, expected);
});

test('createScopedCss should return a selector mapping for descendant CSS selectors', t => {
	const input = stripIndent`
		<style scoped>
			.selector descendant {
				declaration: value;
			}
		</style>
	`;
	const expected = {
	};
	const expectedMapping = {
		'.selector descendant': 'name--571293890-descendant'
	};

	const [actual,,, mapping] = createScopedCss(input, {ns: 'name', vars: new Map()}, 'file', true);

	t.deepEqual(actual, expected);
	t.deepEqual(mapping, expectedMapping);
});

test('getMatchingSelectors return matching tag selectors', t => {
	const input = ['div', 'span'];
	const expected = ['div'];
	const domStack = [[['html'], ['head', 'body']], ['div']];

	const actual = getMatchingSelectors(domStack, input);

	t.deepEqual(actual, expected);
});

test('getMatchingSelectors return matching next sibling selectors', t => {
	const input = ['h2 + p', 'h2 + span', 'h3 + p'];
	const expected = ['h2 + p'];
	const domStack = [[['html'], ['head', 'body']], ['h2', 'p']];

	const actual = getMatchingSelectors(domStack, input);

	t.deepEqual(actual, expected);
});

test('getMatchingSelectors return matching general sibling selectors', t => {
	const input = ['h2 + p', 'h2 ~ span', 'h3 + p'];
	const expected = ['h2 ~ span'];
	const domStack = [[['html'], ['head', 'body']], ['h2', 'div', 'span']];

	const actual = getMatchingSelectors(domStack, input);

	t.deepEqual(actual, expected);
});

test('getMatchingSelectors return matching next and general sibling selectors', t => {
	const input = ['h2 + p', 'h2 + h3 ~ span', 'p + span'];
	const expected = ['h2 + h3 ~ span', 'p + span'];
	const domStack = [[['html'], ['head', 'body']], ['h2', 'h3', 'p', 'span']];

	const actual = getMatchingSelectors(domStack, input);

	t.deepEqual(actual, expected);
});

test('getMatchingSelectors return matching child selectors', t => {
	const input = ['body > p', 'body > span'];
	const expected = ['body > span'];
	const domStack = [[['html'], ['head', 'body']], ['div', 'span']];

	const actual = getMatchingSelectors(domStack, input);

	t.deepEqual(actual, expected);
});

test('getMatchingSelectors return matching selector list', t => {
	const input = ['body > p, body > span', 'body > p, body > div'];
	const expected = ['body > p, body > div'];
	const domStack = [[['html'], ['head', 'body']], ['h1', 'div']];

	const actual = getMatchingSelectors(domStack, input);

	t.deepEqual(actual, expected);
});
