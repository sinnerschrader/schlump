const path = require('path');
const chalk = require('chalk');
const globby = require('globby');
const throat = require('throat');
const sander = require('sander');

const host = require('./host');
const {renderPages} = require('./pages');
const {createTemplates} = require('./templates');
const {createRedirects} = require('./redirects');
const {mixinExternalTemplates} = require('./external-templates');

const cwd = process.cwd();

module.exports = {
	build
};

function build(opts) {
	return Promise.resolve()
		.then(() => {
			const destStatics = path.resolve(cwd, opts.destStatics);

			const srcs = Array.isArray(opts.srcStatics) ?
				opts.srcStatics : [opts.srcStatics];
			const srcsStatics = srcs.map(src => path.resolve(cwd, src));

			const jobs = srcsStatics.map(throat(1, src => {
				return sander.exists(src).then(exists => exists ? sander.copydir(src).to(destStatics) : null);
			}));

			return Promise.all(jobs);
		})
		.then(() => createTemplates(opts.srcTemplates, opts.srcHelpers, {cssVariables: opts.cssVariables}))
		.then(templates => mixinExternalTemplates(opts.templateImport, templates))
		.then(templates =>
			globby([opts.srcPages])
				.then(filepaths => [templates, filepaths]))
		.then(([templates, filepaths]) =>
			globby([path.join(opts.destStatics, '**')])
			.then(statics => {
				// If we need to write css, then implicitly count it to static resources
				if (opts.scopedCss) {
					return [...statics, opts.scopedCss.replace(/^.\//, '')];
				}
				return statics;
			})
			.then(statics => [templates, filepaths, statics]))
		.then(([templates, filepaths, statics]) =>
			renderPages(filepaths, opts.dest, {templates, vars: opts.vars, statics, disableValidation: opts.disableValidation, cssVariables: opts.cssVariables, host})
				.then(pageStylesheets => {
					if (opts.scopedCss) {
						const rules = pageStylesheets.join('\n').split('}').map(rule => rule.trim() + '}');
						const uniqueRules = Array.from(new Set(rules.slice(0, rules.length - 1))).join('\n');
						return sander.writeFile(opts.scopedCss, uniqueRules);
					}
				}))
		.then(() => createRedirects(host, opts.redirectMap, opts.dest))
		.then(() => {
			console.log(`\n${chalk.bold.green('SUCCESS')}\n`);
		})
		.catch(err => {
			console.error(`\n${chalk.bold.red('FAILED')}\n`);
			console.error(err);
			throw err;
		});
}
