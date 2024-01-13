import { isMac } from 'common/isMac';

export function isModKey(event: KeyboardEvent | MouseEvent) {
	if (isMac) {
		return event.metaKey
	}
	else {
		return event.ctrlKey
	}
}
