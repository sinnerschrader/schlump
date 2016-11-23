const test = require('ava');

const {createRedirects} = require('./redirects');

test('createRedirects should write a file at source uri of a given redirect', async t => {
	let actual;
	const host = {
		readFile: () => Promise.resolve('{"/from/path": "http://host:port/to/path"}'),
		writeFile: filename => {
			actual = filename;
			return Promise.resolve();
		}
	};
	const expected = 'destination/from/path/index.html';

	await createRedirects(host, 'redirects', 'destination');

	t.is(actual.replace(/\\/g, '/'), expected);
});

test('createRedirects should write a file with a meta refresh target of a given redirect', async t => {
	let actual;
	const host = {
		readFile: () => Promise.resolve('{"/from/path": "http://host:port/to/path"}'),
		writeFile: (_, content) => {
			actual = content;
			return Promise.resolve();
		}
	};
	const expected = /<meta http-equiv="refresh" content="0; URL=http:\/\/host:port\/to\/path" \/>/;

	await createRedirects(host, 'redirects', 'destination');

	t.regex(actual, expected);
});
