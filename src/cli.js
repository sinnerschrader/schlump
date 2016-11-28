#!/usr/bin/env node

const semver = require('semver');
const meow = require('meow');
const build = require('./index').build;

if (!semver.satisfies(process.version, '>=6')) {
	console.error('At least node 6 is required');
	process.exit(1); // eslint-disable-line unicorn/no-process-exit
}

const cli = meow(`
	Usage
		$ schlump [options]

	Options

		--help, -h             Usage information
		--src                  Source folder (defaults to src)
		--src-pages            Folder to look for pages (default to <src>/pages)
		--src-templates        Folder to look for templates (defaults to <src>/templates)
		--src-statics          Folder to look for static files (defaults to <src>/statics). Repeat for mulitple sources.
		--src-helpers          Folder to look for helper functions (defaults to <src>/helpers)
		--dest                 Destination folder (defaults to dist)
		--dest-statics         Folder to write statics (defaults to <dest>/statics)
		--var.<name>=<value>   Define global properties which are usable during build pages
		--disable-validation   Disable html validation (no link and resource checking)
		--redirect-map         A json file with key value pairs of url-path (source) and full qualifed urls (target)
		--scoped-css           Path of the file to write all scoped css to
		--css-variables        Enable support for css-variables
		--template-import='<file-or-node-module-path>[:<namespace>]'
		                       Imports the react-components from the given path at the given namespace

	Examples
		$ schlump # Execute with default
		$ schlump --src-statics=./statics-one --src-statics=./statics-two
`, {
	alias: {
		h: 'help'
	}
});

function main(flags) {
	const src = flags.src || 'src';
	const dest = flags.dest || 'dist';
	const opts = {
		srcPages: (flags.srcPages || `${src}/pages`) + '/**/*.html',
		srcTemplates: (flags.srcTemplates || `${src}/templates`) + '/**/*.{html,svg,md}',
		srcStatics: flags.srcStatics || `${src}/statics`,
		srcHelpers: flags.srcHelpers || `${src}/helpers`,
		dest,
		destStatics: flags.destStatics || `${dest}/statics`,
		vars: flags.var,
		disableValidation: flags.disableValidation,
		redirectMap: flags.redirectMap,
		scopedCss: flags.scopedCss,
		cssVariables: flags.cssVariables,
		templateImport: flags.templateImport
	};

	return build(opts);
}
main(cli.flags);
