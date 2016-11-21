const path = require('path');
const sander = require('sander');
const CommonMark = require('commonmark');
const ReactRenderer = require('commonmark-react-renderer');
const React = require('react');

const parser = new CommonMark.Parser();
const renderer = new ReactRenderer();

module.exports = {
	renderMarkdownFile,
	wrapMarkdown,
	Markdown
};

function renderMarkdownFile(filepath) {
	const content = sander.readFileSync(path.join(process.cwd(), filepath)).toString();
	return renderMarkdown(content);
}

function renderMarkdown(text) {
	return renderer.render(parser.parse(text));
}

function Markdown(props) {
	const result = props.file ? renderMarkdownFile(props.file) : renderMarkdown(props.text);
	return React.createElement('div', undefined, result);
}

function wrapMarkdown(content) {
	return `
		<Markdown text={'${content.replace(/[\r\n]/g, '\\n')}'}/>
	`;
}
