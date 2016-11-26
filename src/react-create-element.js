const React = require('react');

const {getMatchingSelectors} = require('./css');

module.exports = {
	createElementFactory
};

/**
 * @param {{cssMapping: any}} sandbox
 * @returns {Function} Returns a function compatible with React.createElement
 */
function createElementFactory(sandbox) {
	let reverseCssMapping;
	const getReverseCssMapping = () => {
		// sandbox.cssMapping is {[classname]: hashed-classname}
		// this reverses to {[hashed-classname]: classname}
		if (!reverseCssMapping) {
			reverseCssMapping = Object.keys(sandbox.cssMapping)
				.filter(name => !name.includes(' '))
				.filter(name => name.startsWith('.'))
				.reduce((reverse, name) => {
					reverse[sandbox.cssMapping[name]] = name.replace(/^./, '');
					return reverse;
				}, {});
		}
		return reverseCssMapping;
	};

	const createElement = React.createElement;
	return function (...args) {
		let [tagOrComponent, props, children, ...rest] = args;
		if (typeof tagOrComponent === 'string') {
			class DomWrapper extends React.Component {
				getChildContext() {
					return {
						stack: {
							push: node => {
								this.domStack = this.domStack || [];
								this.domStack.push(node);
							},
							peek: () => {
								return [this.context.stack.peek(), this.domStack || []];
							}
						}
					};
				}

				/**
				 * @param {any} props
				 * @param {any} currentNode
				 */
				processCssMappings(props, currentNode) {
					if (sandbox.cssMapping) {
						const matchingSelectors = getMatchingSelectors(this.context.stack.peek(), Object.keys(sandbox.cssMapping));
						if (matchingSelectors.length > 0) {
							props = this.applyMatchingSelectors(props, matchingSelectors);
						}

						if (props && props.className) {
							const className = props.className
								.split(' ')
								.map(className => getReverseCssMapping()[className])
								.join(' ')
								.trim();
							if (className) {
								currentNode.class = className;
							}
						}
					}
					return props;
				}

				/**
				 * @param {Object} props
				 * @param {string[]} matchingSelectors
				 */
				applyMatchingSelectors(props, matchingSelectors) {
					if (!props) {
						props = {};
					}
					if (!props.className) {
						props.className = '';
					}
					props.className += matchingSelectors
						.map(matchingSelector => sandbox.cssMapping[matchingSelector])
						.join(' ');
					return props;
				}

				render() {
					// note: this calls have side effects - call order matters
					const currentNode = {tag: tagOrComponent};
					this.context.stack.push(currentNode);
					props = this.processCssMappings(props, currentNode);
					return createElement.apply(React, [tagOrComponent, props, children, ...rest]);
				}
			}
			DomWrapper.contextTypes = {
				stack: React.PropTypes.any
			};
			DomWrapper.childContextTypes = {
				stack: React.PropTypes.any
			};
			return createElement.apply(React, [DomWrapper, props, []]);
		}
		return createElement.apply(React, [tagOrComponent, props, children, ...rest]);
	};
}
