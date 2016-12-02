const test = require('ava');
const {stripIndent} = require('common-tags');

const {getMarkup, createScopedCss} = require('./css');

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
	.name--571293890-selector .name--571293890-tdescendant {
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
		'.selector descendant': 'name--571293890-tdescendant'
	};

	const [actual,,, mapping] = createScopedCss(input, {ns: 'name', vars: new Map()}, 'file', true);

	t.deepEqual(actual, expected);
	t.deepEqual(mapping, expectedMapping);
});

test('createScopedCss should resolve variable values recursivly', t => {
	const input = stripIndent`
		<style scoped>
			.selector {
				declaration: var(--name);
			}
		</style>
	`;
	const vars = new Map([
		['--other', 'value'],
		['--name', 'var(--other)']
	]);
	const expected = stripIndent`
	.name--1044404709-selector {
	  declaration: value;
	}
	`;

	const [,, actual] = createScopedCss(input, {ns: 'name', vars}, 'file', true);

	t.deepEqual(actual, expected);
});

test('createScopedCss should handle pseudo-classes correct', t => {
	const input = stripIndent`
		<style scoped>
			.selector:pseudo {
				declaration: value;
			}
		</style>
	`;
	const expectedClasses = {
		selector: 'name-1092746841-selector'
	};
	const expectedStyle = stripIndent`
	.name-1092746841-selector:pseudo {
	  declaration: value;
	}
	`;

	const [actualClasses,, actualStyle] = createScopedCss(input, {ns: 'name', vars: new Map()}, 'file', true);

	t.deepEqual(actualClasses, expectedClasses);
	t.deepEqual(actualStyle, expectedStyle);
});

test('createScopedCss should prefix attribute selectors with classname', t => {
	const input = stripIndent`
		<style scoped>
			[data-attr] {
				declaration: value;
			}
			selector [data-attr] {
				declaration: value;
			}
		</style>
	`;
	const expectedClasses = {
	};
	const expectedStyle = stripIndent`
	.name--192375069[data-attr] {
	  declaration: value;
	}

	selector .name--192375069[data-attr] {
	  declaration: value;
	}
	`;
	const expectedMapping = {
		'[data-attr]': 'name--192375069',
		'selector [data-attr]': 'name--192375069'
	};

	const [actualClasses,, actualStyle, actualMapping] = createScopedCss(input, {ns: 'name', vars: new Map()}, 'file', true);

	t.deepEqual(actualClasses, expectedClasses);
	t.deepEqual(actualStyle, expectedStyle);
	t.deepEqual(actualMapping, expectedMapping);
});

test('createScopedCss should ', t => {
	const input = stripIndent`
		<style scoped>
			:root {
				declaration: value;
			}
		</style>
	`;
	const expectedCss = stripIndent`
	.name--500756630-root {
	  declaration: value;
	}
	`;
	const expectedMapping = {
		':root': 'name--500756630-root'
	};

	const [,, actualCss, actualMapping] = createScopedCss(input, {ns: 'name', vars: new Map()}, 'file', true);

	t.deepEqual(actualCss, expectedCss);
	t.deepEqual(actualMapping, expectedMapping);
});
