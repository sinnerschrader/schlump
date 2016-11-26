const test = require('ava');

const {getMatchingSelectors} = require('./css-matcher');

test('getMatchingSelectors return matching tag selectors', t => {
	const input = ['div', 'span'];
	const expected = ['div'];
	const domStack = [[[{tag: 'html'}], [{tag: 'head'}, {tag: 'body'}]], [{tag: 'div'}]];

	const actual = getMatchingSelectors(domStack, input);

	t.deepEqual(actual, expected);
});

test('getMatchingSelectors return matching next sibling selectors', t => {
	const input = ['h2 + p', 'h2 + span', 'h3 + p'];
	const expected = ['h2 + p'];
	const domStack = [[[{tag: 'html'}], [{tag: 'head'}, {tag: 'body'}]], [{tag: 'h2'}, {tag: 'p'}]];

	const actual = getMatchingSelectors(domStack, input);

	t.deepEqual(actual, expected);
});

test('getMatchingSelectors return matching general sibling selectors', t => {
	const input = ['h2 + p', 'h2 ~ span', 'h3 + p'];
	const expected = ['h2 ~ span'];
	const domStack = [[[{tag: 'html'}], [{tag: 'head'}, {tag: 'body'}]], [{tag: 'h2'}, {tag: 'div'}, {tag: 'span'}]];

	const actual = getMatchingSelectors(domStack, input);

	t.deepEqual(actual, expected);
});

test('getMatchingSelectors return matching next and general sibling selectors', t => {
	const input = ['h2 + p', 'h2 + h3 ~ span', 'p + span'];
	const expected = ['h2 + h3 ~ span', 'p + span'];
	const domStack = [[[{tag: 'html'}], [{tag: 'head'}, {tag: 'body'}]], [{tag: 'h2'}, {tag: 'h3'}, {tag: 'p'}, {tag: 'span'}]];

	const actual = getMatchingSelectors(domStack, input);

	t.deepEqual(actual, expected);
});

test('getMatchingSelectors return matching child selectors', t => {
	const input = ['body > p', 'body > span'];
	const expected = ['body > span'];
	const domStack = [[[{tag: 'html'}], [{tag: 'head'}, {tag: 'body'}]], [{tag: 'div'}, {tag: 'span'}]];

	const actual = getMatchingSelectors(domStack, input);

	t.deepEqual(actual, expected);
});

test('getMatchingSelectors return matching selector list', t => {
	const input = ['body > p, body > span', 'body > p, body > div'];
	const expected = ['body > p, body > div'];
	const domStack = [[[{tag: 'html'}], [{tag: 'head'}, {tag: 'body'}]], [{tag: 'h1'}, {tag: 'div'}]];

	const actual = getMatchingSelectors(domStack, input);

	t.deepEqual(actual, expected);
});

test('getMatchingSelectors return matching decendant selectors (variant >>)', t => {
	const input = ['html >> p', 'html >> span'];
	const expected = ['html >> span'];
	const domStack = [[[{tag: 'html'}], [{tag: 'head'}, {tag: 'body'}]], [{tag: 'div'}, {tag: 'span'}]];

	const actual = getMatchingSelectors(domStack, input);

	t.deepEqual(actual, expected);
});

test('getMatchingSelectors return matching decendant selectors', t => {
	const input = ['html p', 'html span'];
	const expected = ['html span'];
	const domStack = [[[{tag: 'html'}], [{tag: 'head'}, {tag: 'body'}]], [{tag: 'div'}, {tag: 'span'}]];

	const actual = getMatchingSelectors(domStack, input);

	t.deepEqual(actual, expected);
});

test('getMatchingSelectors return matching decendant selectors with class', t => {
	const input = ['.test p', '.test span'];
	const expected = ['.test span'];
	const domStack = [[[{tag: 'html'}], [{tag: 'head'}, {tag: 'body', class: 'a test b'}]], [{tag: 'div'}, {tag: 'span'}]];

	const actual = getMatchingSelectors(domStack, input);

	t.deepEqual(actual, expected);
});

test('getMatchingSelectors return matching complex selector', t => {
	const input = ['body > .container div ~ span'];
	const expected = ['body > .container div ~ span'];
	const domStack = [[[[[{tag: 'html'}], [{tag: 'head'}, {tag: 'body'}]], [{tag: 'div'}, {tag: 'div', class: 'container'}]], [{tag: ''}]], [{tag: 'div'}, {tag: 'span'}]];
	const actual = getMatchingSelectors(domStack, input);

	t.deepEqual(actual, expected);
});

test('getMatchingSelectors return matching attribute [name] selectors', t => {
	const input = ['body [attr]', 'body [no-attr]'];
	const expected = ['body [attr]'];
	const domStack = [[[{tag: 'html'}], [{tag: 'head'}, {tag: 'body'}]], [{tag: 'div', attrs: {attr: 'value'}}]];

	const actual = getMatchingSelectors(domStack, input);

	t.deepEqual(actual, expected);
});

test('getMatchingSelectors return matching attribute [name=value] selectors', t => {
	const input = ['body [attr=value]', 'body [no-attr]'];
	const expected = ['body [attr=value]'];
	const domStack = [[[{tag: 'html'}], [{tag: 'head'}, {tag: 'body'}]], [{tag: 'div', attrs: {attr: 'value'}}]];

	const actual = getMatchingSelectors(domStack, input);

	t.deepEqual(actual, expected);
});

test('getMatchingSelectors return matching attribute [name~=value] selectors', t => {
	const input = ['body [attr~=value]', 'body [no-attr]'];
	const expected = ['body [attr~=value]'];
	const domStack = [[[{tag: 'html'}], [{tag: 'head'}, {tag: 'body'}]], [{tag: 'div', attrs: {attr: 'previous value next'}}]];

	const actual = getMatchingSelectors(domStack, input);

	t.deepEqual(actual, expected);
});
