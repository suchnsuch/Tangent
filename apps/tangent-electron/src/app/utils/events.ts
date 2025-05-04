import { isMac } from 'common/platform';

export function isModKey(event: KeyboardEvent | MouseEvent) {
	if (isMac) {
		return event.metaKey
	}
	else {
		return event.ctrlKey
	}
}
