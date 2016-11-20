const test = require('ava');
const {stripIndent} = require('common-tags');

const {createScopedCss} = require('./css');

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

	const [actual] = createScopedCss(input, 'name', 'file');

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

	const [actual] = createScopedCss(input, 'name', 'file');

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

	const [, {vars: actual}] = createScopedCss(input, 'name', 'file');

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
		.name-selector {
		  --first-variable: red;
		  color: red;
		  background-color: blue;
		}
	`;

	const vars = new Map([['--second-variable', 'blue']]);
	const [, , actual] = createScopedCss(input, {ns: 'name', vars}, 'file');

	t.deepEqual(actual, expected);
});
