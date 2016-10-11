const babel = require('babel-core');

module.exports = {
	transformJsx
};

function transformJsx(code) {
	const options = {
		plugins: ['transform-react-jsx']
	};
	return babel.transform(code, options).code.replace(/;?$/, '');
}
