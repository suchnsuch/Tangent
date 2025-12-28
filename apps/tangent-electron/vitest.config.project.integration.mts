import { defineProject, mergeConfig } from 'vitest/config'
import sharedConfig from './vitest.shared.mjs'

export default mergeConfig(
	sharedConfig,
	defineProject({
		test: {
			name: 'tangent-electron-integration',
			environment: 'node',
			include: [
				'src/main/**/*.integration-test.[jt]s'
			],
			maxConcurrency: 1
		},
	})
)

