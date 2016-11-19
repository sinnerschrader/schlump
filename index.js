const path = require('path');
const globby = require('globby');
const sander = require('sander');
const chalk = require('chalk');

const {renderPages} = require('./src/renderer');
const {createReactComponents} = require('./src/components');
const {createRedirects} = require('./src/redirects');
const {mixinExternalTemplates} = require('./src/external-templates');

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
	const {srcPages, srcTemplates, srcStatics, srcHelpers, dest, destStatics, vars, disableValidation,
		redirectMap, templateImport} = opts;
	const promise =
		sander.copydir(path.join(process.cwd(), srcStatics)).to(path.join(process.cwd(), destStatics))
			.catch(() => {/* just ignore missing statics folder */})
			.then(() => createReactComponents(srcTemplates, srcHelpers))
			.then(components => mixinExternalTemplates(templateImport, components))
			.then(components => globby([srcPages]).then(filepaths => [components, filepaths]))
			.then(([components, filepaths]) => globby([path.join(destStatics, '**')])
				.then(statics => [components, filepaths, statics]))
			.then(([components, filepaths, statics]) =>
				renderPages(filepaths, dest, {components, vars, statics, disableValidation})
					.then(() => [components, statics]))
			.then(([components, statics]) => createRedirects(redirectMap, dest, {components, vars, statics, disableValidation}));
	return logResult(promise);
}
