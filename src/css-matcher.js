const selectorParser = require('postcss-selector-parser');

module.exports = {
	getMatchingSelectors
};

class CssMatcher {

	/**
	 * Creates an instance of CssMatcher.
	 *
	 * @param {any[]} domStack
	 * @param {string} selector
	 *
	 * @memberOf CssMatcher
	 */
	constructor(domStack, selector) {
		this.domStack = JSON.parse(JSON.stringify(domStack));
		this.selector = selector;
		this.updateCurrentSiblings();
		this.resetState();
	}

	resetState() {
		// could be 'current' or 'any'
		this.siblingMatchMode = 'current';
		this.parentMatchMode = 'current';
	}

	updateCurrentSiblings() {
		// no localStack => no siblings
		if (!this.domStack) {
			this.siblings = undefined;
			return;
		}
		// stack structure: [[parents], [siblings]]
		if (this.domStack.length > 0 && Array.isArray(this.domStack[0])) {
			[, this.siblings] = this.domStack;
		} else {
			this.siblings = this.domStack;
		}
	}

	get currentNode() {
		return this.siblings ? this.siblings[this.siblings.length - 1] || {} : {};
	}

	toParent() {
		this.domStack = this.domStack[this.domStack.length - 2];
	}

	isCombinatorMatching(node) {
		switch (node.value) {
			case '+':
				this.parentMatchMode = 'current';
				this.siblingMatchMode = 'current';
				this.siblings.pop();
				return true;
			case '~':
				this.parentMatchMode = 'current';
				this.siblingMatchMode = 'any';
				this.siblings.pop();
				return true;
			case '>':
				this.parentMatchMode = 'current';
				this.siblingMatchMode = 'current';
				this.toParent();
				this.updateCurrentSiblings();
				return true;
			case ' ':
			case '>>':
				this.parentMatchMode = 'any';
				this.siblingMatchMode = 'current';
				this.toParent();
				this.updateCurrentSiblings();
				return true;
			default:
				return false;
		}
	}

	findMatchingParent(node, isMatching) {
		if (this.parentMatchMode === 'current') {
			return isMatching(node);
		} else if (this.parentMatchMode === 'any') {
			while (this.domStack && !isMatching(node)) {
				this.toParent();
				this.updateCurrentSiblings();
			}
			return isMatching(node);
		}
		return false;
	}

	findMatchingSibling(node, matcher) {
		if (this.siblingMatchMode === 'current') {
			return this.findMatchingParent(node, matcher);
		} else if (this.siblingMatchMode === 'any') {
			while (this.siblings.length > 0 && !matcher(node)) {
				this.siblings.pop();
			}
			return matcher(node);
		}
		return false;
	}

	isTypeMatching(node) {
		switch (node.type) {
			case selectorParser.TAG:
				return this.findMatchingSibling(node, node => {
					return node.value === this.currentNode.tag;
				});
			case selectorParser.COMBINATOR:
				return this.isCombinatorMatching(node);
			case selectorParser.CLASS:
				return this.findMatchingSibling(node, node => (this.currentNode.class || '').split(' ').includes(node.value));
			case selectorParser.ATTRIBUTE:
				return this.findMatchingSibling(node, node => {
					if (this.currentNode.attrs && node.attribute in this.currentNode.attrs) {
						if (node.operator === '=') {
							return this.currentNode.attrs[node.attribute] === node.value;
						} else if (node.operator === undefined && node.value === undefined) {
							return true;
						}
					}
					return false;
				});
			default:
				return false;
		}
	}

	getTransform(callback) {
		return selectors => {
			selectors.each(selector => {
				callback(selector);
			});
		};
	}

	getMatchingSelector() {
		const matchingSelectors = [];
		const handle = selector => {
			this.resetState();
			// If each part of the parsed selector matches, then we have a matching selector
			// Matching is done from right to left, so lookups in the domStack are more easy
			let matching = true;
			for (let i = selector.nodes.length; matching && i > 0; i--) {
				matching = this.isTypeMatching(selector.nodes[i - 1]);
			}
			if (matching) {
				matchingSelectors.push(this.selector);
			}
		};
		selectorParser(this.getTransform(handle)).process(this.selector);
		return matchingSelectors;
	}
}

function getMatchingSelectors(domStack, selectors) {
	return selectors.reduce((matchingSelectors, selector) =>
		[...matchingSelectors, ...(new CssMatcher(domStack, selector).getMatchingSelector())], []);
}
