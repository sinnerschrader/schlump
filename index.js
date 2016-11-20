const path = require('path');
const globby = require('globby');
const sander = require('sander');
const chalk = require('chalk');

const {renderPages} = require('./src/renderer');
const {createReactComponents} = require('./src/components');
const {createRedirects} = require('./src/redirects');
const {combineCss} = require('./src/css');

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
		redirectMap, scopedCss} = opts;
	const promise =
		sander.copydir(path.join(process.cwd(), srcStatics)).to(path.join(process.cwd(), destStatics))
			.catch(() => {/* just ignore missing statics folder */})
			.then(() => createReactComponents(srcTemplates, srcHelpers))
			.then(components => globby([srcPages]).then(filepaths => [components, filepaths]))
			.then(([components, filepaths]) => globby([path.join(destStatics, '**')])
				.then(statics => {
					// If we need to write css, then implicitly count it to static resources
					if (scopedCss) {
						return [...statics, scopedCss.replace(/^.\//, '')];
					}
					return statics;
				})
				.then(statics => [components, filepaths, statics]))
			.then(([components, filepaths, statics]) =>
				renderPages(filepaths, dest, {components, vars, statics, disableValidation, scopedCss})
					.then(pageStylesheets => {
						if (scopedCss) {
							return sander.writeFile(scopedCss, combineCss(components, pageStylesheets));
						}
					})
					.then(() => [components, statics]))
			.then(([components, statics]) => createRedirects(redirectMap, dest, {components, vars, statics, disableValidation}));
	return logResult(promise);
}
