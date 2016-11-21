const path = require('path');
const sander = require('sander');
const CommonMark = require('commonmark');
const ReactRenderer = require('commonmark-react-renderer');
const React = require('react');

const parser = new CommonMark.Parser();
const renderer = new ReactRenderer();

module.exports = {
	renderMarkdown,
	Markdown
};

function renderMarkdown(filepath) {
	const content = sander.readFileSync(path.join(process.cwd(), filepath)).toString();
	return renderer.render(parser.parse(content));
}

function Markdown(props) {
	return React.createElement('div', undefined, renderMarkdown(props.file));
}
