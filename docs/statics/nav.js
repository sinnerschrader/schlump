window.addEventListener('click', e => {
	if (e.target.tagName === 'A') {
		e.preventDefault();
	}
	window.history.pushState(undefined, '', e.target.href);
	render();
});

window.onpopstate = e => {
	console.log(e);
	render();
};

function render() {
	switch (window.location.pathname) {
		case '/index2.html':
			ReactDOM.render(SitePagesIndex2Html({foo: 'bar'}), document);
			break;
		case '/index.html':
		default:
			ReactDOM.render(SitePagesIndexHtml({foo: 'bar'}), document);
			break;
	}
}

render();
