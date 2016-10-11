const path = require('path');
const sander = require('sander');
const htmlparser = require('htmlparser');
const {select} = require('soupselect');

module.exports = {
	validatePages
};

function validatePages(destinationPath, files) {
	return Promise.all(files.map(filepath => sander.readFile(filepath)))
		.then(contents => contents.map(content => parseHtml(content)))
		.then(doms => {
			doms.forEach((dom, index) => {
				checkAnchor(dom, files[index], destinationPath, files);
			});
		});
}

function parseHtml(html) {
	const handler = new htmlparser.DefaultHandler(() => undefined);
	const parser = new htmlparser.Parser(handler);
	parser.parseComplete(html);
	return handler.dom;
}

function checkAnchor(dom, sourcefile, destinationPath, files) {
	const anchors = select(dom, 'a[href]');
	anchors
		.filter(anchor => validatableAnchor(anchor))
		.map(anchor => [anchor, anchorToPath(anchor, sourcefile, destinationPath)])
		.map(([anchor, filepath]) => [anchor, extendPath(filepath)])
		.forEach(([anchor, filepath]) => {
			if (files.indexOf(filepath) === -1) {
				const source = path.relative(destinationPath, sourcefile);
				throw new Error(`Invalid anchor to page '${anchor.attribs.href}' found in '${source}'.`);
			}
		});
}

function validatableAnchor(anchor) {
	return !anchor.attribs.href.startsWith('#') &&
		!anchor.attribs.href.startsWith('http://') &&
		!anchor.attribs.href.startsWith('https://') &&
		!anchor.attribs.href.startsWith('mailto:');
}

function isAbsolute(anchor) {
	return anchor.attribs.href.startsWith('/');
}

function anchorToPath(anchor, sourcefile, destinationPath) {
	return path.join(isAbsolute(anchor) ? destinationPath : path.dirname(sourcefile), anchor.attribs.href);
}

function extendPath(filepath) {
	return path.extname(filepath) ? filepath : path.join(filepath, 'index.html');
}
