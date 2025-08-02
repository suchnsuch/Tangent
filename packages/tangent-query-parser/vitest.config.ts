import { defineProject } from 'vitest/config'

export default defineProject({
	test: {
		name: 'tangent-query-parser',
		environment: 'node',
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
