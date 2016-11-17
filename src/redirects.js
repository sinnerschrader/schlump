const sander = require('sander');
const chalk = require('chalk');
const figures = require('figures');
const {/* renderPages, */getDestinationPath} = require('./renderer');

module.exports = {
	createRedirects
};

function createRedirects(redirectMap, dest) {
	if (!redirectMap) {
		return Promise.resolve();
	}
	console.log(`\nGenerating redirects...`);
	return sander.readFile(redirectMap)
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
			return sander.writeFile(destinationPath, html)
				.then(() => {
					console.log(`  ${chalk.bold.green(figures.tick)} ${from} -> ${destinationPath}`);
				});
		})));
}
