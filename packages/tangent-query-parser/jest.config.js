export default {
	transform: {
		'^.+\\.(t|j)sx?$': 'ts-jest'
	},
	transformIgnorePatterns: [
		"node\_modules/(?!(@such-n-such))"
	],
	testEnvironment: 'node',
	testRegex: '/tests/.*\\.(test|spec)?\\.(ts|tsx)$'
};