const test = require('ava');

const {createElementFactory} = require('./react-create-element');

test('createElementFactory function should call React.createElement if a component was given to render', t => {
	const Comp = () => null;

	const factory = createElementFactory({});
	const actual = factory(Comp, undefined, []);

	t.is(actual.type, Comp);
});

test('createElementFactory function should wrap React.createElement if a tag was given to render', t => {
	const factory = createElementFactory({});
	const actual = factory('div', undefined, []);

	t.is(actual.type.name, 'DomWrapper');
});

test('createElementFactory function should add matched classes', t => {
	const sandbox = {
		cssMapping: {
			div: 'test'
		}
	};
	const stack = {
		push: () => {},
		peek: () => {
			return [[{tag: 'div'}], [{tag: 'div'}]];
		}
	};

	const factory = createElementFactory(sandbox);
	const instance = factory('div', undefined, []);

	const Wrapped = instance.type;
	const actual = new Wrapped({}, {stack}).render();

	t.is(actual.props.className, 'test');
});
