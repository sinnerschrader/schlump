const resolveFrom = require('resolve-from');

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
		const externalTemplates = require(resolveFrom(process.cwd(), templateImportSource)); // eslint-disable-line import/no-dynamic-require
		if (namespace) {
			components[namespace] = externalTemplates;
		} else {
			components = Object.assign({}, externalTemplates, components);
		}
	}
	return components;
}
