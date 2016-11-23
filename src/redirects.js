const chalk = require('chalk');
const figures = require('figures');
const {getDestinationPath} = require('./pages');

module.exports = {
	createRedirects
};

function createRedirects(host, redirectMap, dest) {
	if (!redirectMap) {
		return Promise.resolve();
	}
	console.log(`\nGenerating redirects...`);
	return host.readFile(redirectMap)
		.then(content => JSON.parse(content))
		.then(redirects => Object.keys(redirects).map(from => [from, `
			<html>
				<head>
					<meta http-equiv="refresh" content="0; URL=${redirects[from]}" />
				</head>
				<body>
				</body>
			</html>
			`.replace(/(?:\n|\r|\t)/g, '')]))
		.then(redirects => Promise.all(redirects.map(([from, html]) => {
			const destinationPath = getDestinationPath(from, dest);
			return host.writeFile(destinationPath, html)
				.then(() => {
					console.log(`  ${chalk.bold.green(figures.tick)} ${from} -> ${destinationPath}`);
				});
		})));
}
