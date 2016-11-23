const path = require('path');
const globby = require('globby');
const sander = require('sander');
const chalk = require('chalk');

const host = require('./host');
const {renderPages} = require('./pages');
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
			.then(templates => mixinExternalTemplates(templateImport, templates))
			.then(templates => globby([srcPages]).then(filepaths => [templates, filepaths]))
			.then(([templates, filepaths]) => globby([path.join(destStatics, '**')])
				.then(statics => {
					// If we need to write css, then implicitly count it to static resources
					if (scopedCss) {
						return [...statics, scopedCss.replace(/^.\//, '')];
					}
					return statics;
				})
				.then(statics => [templates, filepaths, statics]))
			.then(([templates, filepaths, statics]) =>
				renderPages(filepaths, dest, {templates, vars, statics, disableValidation, cssVariables, host})
					.then(pageStylesheets => {
						if (scopedCss) {
							const rules = pageStylesheets.join('\n').split('}').map(rule => rule.trim() + '}');
							const uniqueRules = Array.from(new Set(rules)).join('\n');
							return sander.writeFile(scopedCss, uniqueRules);
						}
					}))
			.then(() => createRedirects(host, redirectMap, dest));
	return logResult(promise);
}
