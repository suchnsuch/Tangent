import type { SKUTypes } from '../types'
import type { PageServerLoad } from './$types'

export const prerender = false

export const load = (async ({ request }) => {
	
	const userAgent = request.headers.get('user-agent')

	let highlightChoice: SKUTypes = null
	let altChoices: SKUTypes[] = []

	const isMac = userAgent?.indexOf('Macintosh') !== -1
	const isLinux = userAgent?.indexOf('Linux') !== -1

	if (isMac) {
		highlightChoice = 'mac'
		altChoices = ['win', 'win_portable', 'linux', 'linux_arm64']
	}
	else if (isLinux) {
		highlightChoice = 'linux',
		altChoices = ['linux_arm64', 'win', 'win_portable', 'mac']
	}
	else {
		highlightChoice = 'win',
		altChoices = ['win_portable', 'mac', 'linux', 'linux_arm64']
	}
	return {
		highlightChoice,
		altChoices
	}
}) satisfies PageServerLoad
