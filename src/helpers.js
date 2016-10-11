const path = require('path');
const sander = require('sander');
const requireAll = require('require-all');
const chalk = require('chalk');
const figures = require('figures');

module.exports = {
	loadHelpers
};

function loadHelpers(srcHelpers) {
	if (!sander.existsSync(srcHelpers)) {
		return {};
	}
	console.log(`Loading helpers...`);
	const plainHelpers = requireAll({
		dirname: path.resolve(srcHelpers),
		map: name => name.replace(/-([a-z])/g, (m, c) => c.toUpperCase())
	});
	const helpers = Object.keys(plainHelpers).reduce((helpers, name) => {
		if (typeof plainHelpers[name] === 'function') {
			console.log(`  ${chalk.bold.green(figures.tick)} ${name} - ok`);
			helpers[name] = plainHelpers[name];
		} else {
			console.log(`  ${chalk.bold.red(figures.cross)} ${name} - does not export a function`);
		}
		return helpers;
	}, {});
	return helpers;
}
