import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		projects: [
			'apps/*/vitest.config.project.*',
			'packages/*/vitest.config.project.*'
		]
	}
})