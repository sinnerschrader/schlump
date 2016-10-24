const path = require('path');
const sander = require('sander');
const requireAll = require('require-all');
const chalk = require('chalk');
const figures = require('figures');

module.exports = {
	loadHelpers
};

const TICK = chalk.bold.green(figures.tick);
const CROSS = chalk.bold.red(figures.cross);

function loadHelpers(srcHelpers) {
	if (!sander.existsSync(srcHelpers)) {
		return {};
	}
	console.log(`Loading helpers...`);
	const helpers = requireAll({
		dirname: path.resolve(srcHelpers),
		map: name => name.replace(/-([a-z])/g, (m, c) => c.toUpperCase())
	});
	return validateHelpers(helpers);
}

function validateHelpers(plainHelpers) {
	return Object.keys(plainHelpers).reduce((helpers, name) => {
		if (typeof plainHelpers[name] === 'function') {
			console.log(`  ${TICK} ${name} - ok`);
			helpers[name] = plainHelpers[name];
		} else {
			console.log(`  ${CROSS} ${name} - does not export a function`);
		}
		return helpers;
	}, {});
}