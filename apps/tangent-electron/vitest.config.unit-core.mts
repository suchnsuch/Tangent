import { defineProject, mergeConfig } from 'vitest/config'
import sharedConfig from './vitest.shared.mjs'

export default mergeConfig(
	sharedConfig,
	defineProject({
		test: {
			name: 'tangent-electron-unit-core',
			environment: 'node',
			include: [
				'src/{main,common}/**/*.test.[jt]s'
			]
		},
	})
)

