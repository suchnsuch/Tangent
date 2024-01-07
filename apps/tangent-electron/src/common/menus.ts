import type { MenuItemConstructorOptions } from 'electron/common';

export interface ContextMenuTemplate {
	top?: MenuItemConstructorOptions[]
	bottom?: MenuItemConstructorOptions[]
	mixWithDefaultContext?: boolean
}

/**
 * Strips out leading, adjacent, and trailing seperators.
 * Windows does not do this automatically, unlike MacOS.
 */
export function cleanMenuTemplate(template: MenuItemConstructorOptions[]) {
	const newTemplate: MenuItemConstructorOptions[] = []
	let lastAddedItem: MenuItemConstructorOptions = null

	for (let i = 0; i < template.length; i++) {
		const item = template[i]
		if (item.type === 'separator') {
			// No leading seperators
			if (newTemplate.length === 0) continue
			// No sequential seperators
			if (lastAddedItem?.type === 'separator') continue
			// No trailing seperators
			if (i === template.length - 1) continue
		}

		if (item.submenu) {
			item.submenu = cleanMenuTemplate(template)
		}

		newTemplate.push(item)
		lastAddedItem = item
	}

	return newTemplate
}