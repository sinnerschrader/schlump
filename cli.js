#!/usr/bin/env node
const semver = require('semver');
const meow = require('meow');
const build = require('./index').build;

if (!semver.satisfies(process.version, '>=6')) {
	console.error('At least node 6 is required');
	process.exit(1); // eslint-disable-line xo/no-process-exit
}

const cli = meow(`
	Usage
		$ schlump

	Options

		--help           Usage information
		--src            Source folder (defaults to src)
		--src-pages      Folder to look for pages (default to <src>/pages)
		--src-templates  Folder to look for templates (defaults to <src>/templates)
		--src-statics    Folder to look for static files (defaults to <src>/statics)
		--dest           Destination folder (defaults to dist)
		--dest-statics    Folder to write statics (defaults to <dest>/statics)
`, {});
if (cli.flags.help) {
	cli.showHelp();
	process.exit(0); // eslint-disable-line xo/no-process-exit
}

function main(flags) {
	const src = flags.src || 'src';
	const dest = flags.dest || 'dist';
	const opts = {
		srcPages: (flags.srcPages || `${src}/pages`) + '/**/*.html',
		srcTemplates: (flags.srcTemplates || `${src}/templates`) + '/**/*.html',
		srcStatics: flags.srcStatics || `${src}/statics`,
		dest,
		destStatics: flags.destStatics || `${dest}/statics`
	};

	return build(opts);
}
main(cli.flags);
