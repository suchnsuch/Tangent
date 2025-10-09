import { isMac } from 'common/platform'
import * as twShortcuts from 'typewriter-editor/dist/modules/shortcutFromEvent'

const modReplace = /CommandOrControl|Mod/i

export function shortcutsDisplayString(shortcuts: string | string[]) {
	if (Array.isArray(shortcuts)) {
		return shortcuts.map(shortcutDisplayString).join(', ')
	}
	return shortcutDisplayString(shortcuts)
}

function convertToDisplayCharacters(shortcut: string) {
	if (isMac) {
		shortcut = shortcut.replace(modReplace, '⌘')
		shortcut = shortcut.replace(/alt/i, '⌥')
		shortcut = shortcut.replace(/ctrl/i, '⌃')
		shortcut = shortcut.replace(/shift/i, '⇧')
	}
	else {
		shortcut = shortcut.replace(modReplace, 'Ctrl')
	}

	shortcut = shortcut.replace(/left/i, '←')
	shortcut = shortcut.replace(/right/i, '→')
	shortcut = shortcut.replace(/up/i, '↑')
	shortcut = shortcut.replace(/down/i, '↓')

	return shortcut
}

export function shortcutDisplayString(shortcut: string) {
	shortcut = convertToDisplayCharacters(shortcut)
	if (isMac) {
		shortcut = shortcut.replace(/\+/g, ' ')
	}

	return shortcut
}

export function shortcutsHtmlString(shortcuts: string | string[]) {
	if (Array.isArray(shortcuts)) {
		return shortcuts.map(shortcutHtmlString).join(', ')
	}
	return shortcutHtmlString(shortcuts)
}

export function shortcutHtmlString(shortcut: string) {
	shortcut = convertToDisplayCharacters(shortcut)

	const groups = shortcut.split('+').map(g => '<span class="group">' + g + '</span>')

	if (isMac) {
		return groups.join('')
	}

	return groups.join('+')
}

export function shortcutToElectronShortcut(shortcut: string) {
	shortcut = shortcut.replace('Mod', 'CommandOrControl')
	return shortcut
}

// TODO: Typewriter would probably benefit from this addition
// Pulled from https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_code_values
const codeSubs = {
	'BracketLeft': '[',
	'BracketRight': ']',
	'Minus': '-',
	'Equal': '=',
	'Semicolon': ';',
	'Quote': '\'',
	'Backslash': '\\',
	'Comma': ',',
	'Period': '.',
	'Slash': '/',
	'ArrowLeft': 'Left',
	'ArrowRight': 'Right',
	'ArrowUp': 'Up',
	'ArrowDown': 'Down'
}

const modifierKeys = {
	Control: true,
	Meta: true,
	Shift: true,
	Alt: true
};

function codeToShortcutKey(code: string) {

	const sub = codeSubs[code]
	if (sub) return sub

	const keyMatch = code.match(/^Key/)
	if (keyMatch) return code.substring(3)

	const digitMatch = code.match(/^Digit/)
	if (digitMatch) return code.substring(5)

	return code
}

export function shortcutFromEvent(event: KeyboardEvent) {
	const shortcutArray: string[] = []
	if (!event.key) return ''

	if (event.metaKey) shortcutArray.push(isMac ? 'Mod' : 'Meta')
	if (event.ctrlKey) shortcutArray.push(isMac ? 'Ctrl' : 'Mod')
	if (event.altKey) shortcutArray.push('Alt')
	if (event.shiftKey) shortcutArray.push('Shift')

	if (!eventIsModifier(event)) {
		shortcutArray.push(codeToShortcutKey(event.code))
	}

	let shortcut = shortcutArray.join('+')

	return shortcut
}

export function eventIsModifier(event: KeyboardEvent) {
	return modifierKeys[event.key]
}

export function eventIsShortcutable(event: KeyboardEvent) {
	return event.metaKey || event.altKey || event.ctrlKey || (event as any).shortcutable === true
}

export function markEventAsShortcutable(event: KeyboardEvent) {
	(event as any).shortcutable = true
}
