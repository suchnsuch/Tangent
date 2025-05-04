import scrollTo from './scrollto'

import { focusLayer, Focus } from './focus'
import { isMac } from 'common/platform'
export * from './dragging'

export {
	scrollTo,
	focusLayer,
	Focus
}

export function getFileBrowserName() {
	if (isMac) {
		return 'Finder'
	}
	return 'Explorer'
}

export function isLeftClick(event: MouseEvent) {
	if (event.button !== 0) return false
	if (isMac && event.ctrlKey) return false
	return true
}
