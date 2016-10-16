const path = require('path');
const globby = require('globby');
const sander = require('sander');
const chalk = require('chalk');

const {renderPages} = require('./src/renderer');
const {createReactComponents} = require('./src/components');

module.exports = {
	build
};

function logResult(promise) {
	return promise
		.then(() => {
			console.log(`\n${chalk.bold.green('SUCCESS')}\n`);
		})
		.catch(err => {
			console.error(`\n${chalk.bold.red('FAILED')}\n`);
			console.error(err);
			throw err;
		});
}

function build(opts) {
	const {srcPages, srcTemplates, srcStatics, srcHelpers, dest, destStatics} = opts;
	const promise =
		sander.copydir(path.join(process.cwd(), srcStatics)).to(path.join(process.cwd(), destStatics))
			.catch(() => {/* just ignore missing statics folder */})
			.then(() => createReactComponents(srcTemplates, srcHelpers))
			.then(components => globby([srcPages]).then(filepaths => [components, filepaths]))
			.then(([components, filepaths]) => renderPages(filepaths, components, dest));
	return logResult(promise);
}
