const path = require('path');

module.exports = {
	mixinExternalTemplates
};

function mixinExternalTemplates(templateImport, components) {
	if (templateImport) {
		if (!Array.isArray(templateImport)) {
			templateImport = [templateImport];
		}
		components = templateImport.reduce((components, templateLibrary) =>
			importTemplateLibrary(templateLibrary, components), components);
	}
	return components;
}

function importTemplateLibrary(templateImport, components) {
	const matches = templateImport.match(/([^:]+)(?::(.*))?/);
	if (matches) {
		const [, templateImportSource, namespace] = matches;
		const externalTemplates = require(templateImportSource.startsWith('.') ? // eslint-disable-line import/no-dynamic-require
			path.resolve(process.cwd(), templateImportSource) :
			templateImportSource);
		if (namespace) {
			components[namespace] = externalTemplates;
		} else {
			components = Object.assign({}, externalTemplates, components);
		}
	}
	return components;
}
