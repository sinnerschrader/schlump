const path = require('path');
const sander = require('sander');
const htmlparser = require('htmlparser');
const {select} = require('soupselect');

module.exports = {
	validatePages
};

function validatePages(destinationPath, files, statics) {
	return Promise.all(files.map(filepath => sander.readFile(filepath)))
		.then(contents => contents.map(content => parseHtml(content)))
		.then(doms => {
			doms.forEach((dom, index) => checkAnchor(dom, files[index], destinationPath, files));
			doms.forEach((dom, index) => checkStatics(dom, files[index], destinationPath, statics));
		});
}

function parseHtml(html) {
	const handler = new htmlparser.DefaultHandler(() => undefined);
	const parser = new htmlparser.Parser(handler);
	parser.parseComplete(html);
	return handler.dom;
}

function toPath(pathlike, sourcefile, destinationPath) {
	return path.join(pathlike.startsWith('/') ? destinationPath : path.dirname(sourcefile), pathlike);
}

function extendPath(filepath) {
	return path.extname(filepath) ? filepath : path.join(filepath, 'index.html');
}

function checkAnchor(dom, sourcefile, destinationPath, files) {
	const validatableAnchor = anchor =>
		!anchor.attribs.href.startsWith('#') &&
		!anchor.attribs.href.startsWith('http://') &&
		!anchor.attribs.href.startsWith('https://') &&
		!anchor.attribs.href.startsWith('mailto:');

	const anchors = select(dom, 'a[href]');
	anchors
		.filter(anchor => validatableAnchor(anchor))
		.map(anchor => [anchor, toPath(anchor.attribs.href, sourcefile, destinationPath)])
		.map(([anchor, filepath]) => [anchor, extendPath(filepath)])
		.forEach(([anchor, filepath]) => {
			if (files.indexOf(filepath) === -1) {
				const source = path.relative(destinationPath, sourcefile);
				throw new Error(`Invalid anchor to page '${anchor.attribs.href}' found in '${source}'.`);
			}
		});
}

function checkStatics(dom, sourcefile, destinationPath, files) {
	const validatableImage = image =>
		!image.attribs.src.startsWith('http://') &&
		!image.attribs.src.startsWith('https://');

	const images = select(dom, 'img[src]');
	images
		.filter(image => validatableImage(image))
		.map(image => [image, toPath(image.attribs.src, sourcefile, destinationPath)])
		.map(([image, filepath]) => [image, extendPath(filepath)])
		.forEach(([image, filepath]) => {
			if (files.indexOf(filepath) === -1) {
				const source = path.relative(destinationPath, sourcefile);
				throw new Error(`Invalid image src to resource '${image.attribs.src}' found in '${source}'.`);
			}
		});
}
