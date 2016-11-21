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
