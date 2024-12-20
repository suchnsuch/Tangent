import { defineProject } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineProject({
	test: {
		server: {
			deps: {
				// Typewriter has weird ESM export issues
				inline: [
					/@typewriter\/(document|delta)/,
					/@such-n-such/
				]
			}
		},
		workspace: '../../vitest.workspace.ts'
	},
	plugins: [
		tsconfigPaths()
	]
})
