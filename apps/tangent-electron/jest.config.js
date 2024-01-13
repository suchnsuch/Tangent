
const common = {
	transform: {
		//.'^.+\\.jsx?$': 'babel-jest',
		//'^.+\\.tsx?$': 'ts-jest'
		'^.+\\.(t|j)sx?$': 'ts-jest'
	},
	transformIgnorePatterns: [
		"node_modules/(?!(@typewriter|yaml|@such-n-such|svelte|katex))"
	]
}

/**
 * Note on `moduleNameMapper`:
 * 	Svelte now requires that you remap its imports to svelte/src/runtime
 *  This config lets tests pass
 */

module.exports = {
	projects: [
		{
			displayName: 'core',
			preset: 'ts-jest',
			testEnvironment: 'node',
			testMatch: [
				'**/src/**/?(*.)+(spec|test).[jt]s?(x)',
				'!**/src/app/**'
			],
			moduleDirectories: ['node_modules', 'src'],
			moduleNameMapper: {
				"/^svelte\/(.*)$/": "node_modules/svelte/src/runtime/$1"
			},

			...common
		},
		{
			displayName: 'dom',
			preset: 'ts-jest',
			testEnvironment: 'jsdom',
			testMatch: [ "**/src/app/**/?(*.)+(spec|test).[jt]s?(x)" ],
			moduleDirectories: ['node_modules', 'src'],
			moduleNameMapper: {
				"/^svelte\/(.*)$/": "node_modules/svelte/src/runtime/$1"
			},

			...common
		},
		{
			displayName: 'integration',
			preset: 'ts-jest',
			testEnvironment: 'node',
			testMatch: [
				'**/src/**/?(*.)+(integration-test).[jt]s?(x)',
				'!**/src/app/**'
			],
			moduleDirectories: ['node_modules', 'src'],
			moduleNameMapper: {
				"/^svelte\/(.*)$/": "node_modules/svelte/src/runtime/$1"
			},

			...common
		},
	]
};
