import path from 'path'
import { defineProject, mergeConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { playwright } from '@vitest/browser-playwright'
import sharedConfig from './vitest.shared.mjs'

export default mergeConfig(
	sharedConfig,
	defineProject({
		test: {
			name: 'tangent-electron-unit-web',
			environment: 'jsdom',
			include: [
				'src/app/**/*.test.[jt]s'
			],
			browser: {
				enabled: true,
				provider: playwright(),
				instances: [{ browser: 'chromium' }],
				headless: true,
				screenshotFailures: false
			}
		},
		plugins: [
			svelte({
				configFile: path.join(__dirname, 'svelte.config.js')
			})
		],
		resolve: {
			// Including defaults from https://vite.dev/config/shared-options.html#resolve-conditions
			// and adding 'svelte' so that we can resolve typewriter-editor's bizarre exports
			conditions: ['module', 'browser', 'development|production', 'svelte']
		},
	})
)

