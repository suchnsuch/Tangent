import { defineProject } from 'vitest/config'

export default defineProject({
	test: {
		name: 'tangent-html-to-markdown',
		environment: 'jsdom',
		include: [
			'tests/**/*.test.[jt]s'
		],
		server: {
			deps: {
				inline: [
					/@such-n-such/
				]
			}
		}
	}
})
