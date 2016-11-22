const CommonMark = require('commonmark');
const ReactRenderer = require('commonmark-react-renderer');
const React = require('react');
const {stripIndent} = require('common-tags');

const parser = new CommonMark.Parser();
const renderer = new ReactRenderer();

module.exports = {
	renderMarkdown,
	wrapMarkdown,
	Markdown
};

function renderMarkdown(text) {
	return renderer.render(parser.parse(stripIndent`${text}`));
}

function Markdown(props) {
	return React.createElement('div', undefined, renderMarkdown(props.children));
}

function wrapMarkdown(content) {
	return `
		<Markdown>{'${content.replace(/[\r\n]/g, '\\n')}'}</Markdown>
	`;
}
