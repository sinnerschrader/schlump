const vm = require('vm');
const babel = require('babel-core');
const generate = require('babel-generator').default;

module.exports = {
	transformJsx,
	evaluateHelpers
};

function transformJsx(code) {
	const options = {
		babelrc: false,
		plugins: [
			'transform-react-jsx'
		]
	};
	const ast = babel.transform(code, options).ast;
	const last = ast.program.body.pop();
	return {
		helpers: generate(ast, {}, code).code,
		statement: generate(last, {}, code).code.replace(/;?$/, '')
	};
}

function evaluateHelpers(helpers) {
	const sandbox = {};
	const opts = {};
	vm.runInNewContext(helpers, sandbox, opts);
	return sandbox;
}
