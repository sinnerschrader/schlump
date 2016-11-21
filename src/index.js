const path = require('path');
const globby = require('globby');
const sander = require('sander');
const chalk = require('chalk');

const {renderPages} = require('./renderer');
const {createTemplates} = require('./templates');
const {createRedirects} = require('./redirects');
const {mixinExternalTemplates} = require('./external-templates');

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
		redirectMap, scopedCss, cssVariables, templateImport} = opts;
	const promise =
		sander.copydir(path.join(process.cwd(), srcStatics)).to(path.join(process.cwd(), destStatics))
			.catch(() => {/* just ignore missing statics folder */})
			.then(() => createTemplates(srcTemplates, srcHelpers, {cssVariables}))
			.then(components => mixinExternalTemplates(templateImport, components))
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
				renderPages(filepaths, dest, {components, vars, statics, disableValidation, cssVariables})
					.then(pageStylesheets => {
						if (scopedCss) {
							return sander.writeFile(scopedCss,
								Array.from(new Set(pageStylesheets.join('\n').split('}').map(rule => rule.trim() + '}'))).join('\n'));
						}
					})
					.then(() => [components, statics]))
			.then(([components, statics]) => createRedirects(redirectMap, dest, {components, vars, statics, disableValidation}));
	return logResult(promise);
}
