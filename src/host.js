const sander = require('sander');

module.exports = {
	readFile(filename) {
		return sander.readFile(filename);
	},
	writeFile(filename, content) {
		return sander.writeFile(filename, content);
	}
};
