import { isMac } from 'common/platform';

export function isModKey(event: KeyboardEvent | MouseEvent) {
	return isMac ? event.metaKey : event.ctrlKey
}
