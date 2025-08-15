import { isModKey } from 'app/utils/events';
import type { HrefFormedLink } from 'common/indexing/indexTypes';
import { type Editor, type ShortcutEvent } from 'typewriter-editor';
import TangentLink from './NoteEditor/t-link';
import { ReadableStore } from 'common/stores';

interface NavigationEventData {
	link: HrefFormedLink
	incitingEvent?: MouseEvent | KeyboardEvent
}

export class NavigationEvent extends Event implements NavigationEventData {
	link: HrefFormedLink
	incitingEvent?: MouseEvent | KeyboardEvent

	constructor(type: string, data: NavigationEventData & EventInit) {
		super(type, data)
		this.link = data.link
		this.incitingEvent = data.incitingEvent
	}
}

function getTagFromClassSafeName(classSafeName: string) {
	return classSafeName.replaceAll('--', '/')
}

function getTagFromClassList(classList: DOMTokenList): string {
	for (let i = 0; i < classList.length; i++) {
		const item = classList[i]
		if (item.startsWith('TAG-')) {
			return getTagFromClassSafeName(item.substring(4))
		}
	}
	return null
}

type LinkFollowType = 'mod' | 'none'
export default function tlinkModule(editor: Editor, options?: {
	/** What modifiers need to be pressed to follow a link */
	linkFollowRequirement?: LinkFollowType | ReadableStore<LinkFollowType>
}) {

	const linkFollowType = options?.linkFollowRequirement ?? 'mod'

	function isLinkFollowingEvent(event: MouseEvent) {
		if (TangentLink.isNavigationLinkOverride(event)) return true
		if (event.button === 0) {
			const followType = typeof linkFollowType === 'string'
				? linkFollowType
				: linkFollowType.value
			
			switch (followType) {
				case 'mod':
					return isModKey(event)
				case 'none':
					return !isModKey(event)
			}
		}
		if (event.button === 1) {
			return true
		}
		return false
	}

	function onClick(event: MouseEvent) {
		console.log('click', event.defaultPrevented)
		if (!event.defaultPrevented && isLinkFollowingEvent(event)) {
			if (TangentLink.isTangentLinkEvent(event)) {
				event.preventDefault()
				let linkElement = TangentLink.getTangentLinkFromEvent(event)
				console.log('linking', linkElement)
				editor.dispatchEvent(new NavigationEvent('navigate', {
					incitingEvent: event,
					link: linkElement.getLinkInfo()
				}))
			}
			else if (event.target instanceof HTMLElement && event.target.classList.contains('tagSection')) {
				// Handle tags
				event.preventDefault()
				const tagName = getTagFromClassList(event.target.classList)
				console.log('linking to', tagName)
				editor.dispatchEvent(new NavigationEvent('navigate', {
					incitingEvent: event,
					link: {
						form: 'tag',
						href: tagName
					}
				}))
			}
		}
	}

	function onMouseDown(event: MouseEvent) {
		if (event.button === 1 && TangentLink.isTangentLinkEvent(event)) {
			// On windows, middle clicking a link on a scrollable element enables windows' terrible middle click scrolling feature.
			// Grabbing on mouse down is a bit hacky, but avoids that issue.
			return onClick(event)
		}
		if (isLinkFollowingEvent(event) && TangentLink.isTangentLinkEvent(event)) {
			// Text selection is based on mousedown rather than mouseup.
			// If we don't stop this, clicking on a link will _always_ select text.
			event.preventDefault()
			return
		}
	}

	function navigate(event: ShortcutEvent) {
		let formats = editor.doc.getFormats()
		if (formats.t_link) {
			editor.dispatchEvent(new NavigationEvent('navigate', {
				incitingEvent: event,
				link: formats.t_link
			}))
			event.preventDefault()
		}
		else if (formats.t_embed) {
			editor.dispatchEvent(new NavigationEvent('navigate', {
				incitingEvent: event,
				link: formats.t_embed
			}))
			event.preventDefault()
		}
		else if (formats.tag_section) {
			const tagName = getTagFromClassSafeName(formats.tag_section.name)
			editor.dispatchEvent(new NavigationEvent('navigate', {
				incitingEvent: event,
				link: {
					form: 'tag',
					href: tagName
				}
			}))
			event.preventDefault()
		}
	}

	function onKeyDown(event: ShortcutEvent) {
		if (event.defaultPrevented) return

		switch (event.modShortcut) {
			// Overload all of these so that shift & alt modifications can bubble
			case 'Mod+Enter':
			case 'Mod+Shift+Enter':
			case 'Mod+Alt+Enter':
				return navigate(event)
		}
	}

	return {
		init() {
			editor.on('click', onClick)
			editor.on('mousedown', onMouseDown)
			editor.root.addEventListener('shortcut', onKeyDown)
		},
		destroy() {
			editor.off('click', onClick)
			editor.off('mousedown', onMouseDown)
			editor.root.removeEventListener('shortcut', onKeyDown)
		}
	}
}
