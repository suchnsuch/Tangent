import type { MenuItemConstructorOptions } from 'electron/common';

export type TangentRoleOptions = {
	tangentRole?: 'checkForUpdates'
}

export type TangentMenuItemConstructorOptions = MenuItemConstructorOptions & TangentRoleOptions

export interface ContextMenuTemplate {
	top?: TangentMenuItemConstructorOptions[]
	middle?: TangentMenuItemConstructorOptions[]
	bottom?: TangentMenuItemConstructorOptions[]
	mixWithDefaultContext?: boolean
}

/**
 * Strips out leading, adjacent, and trailing seperators.
 * Windows does not do this automatically, unlike MacOS.
 */
export function cleanMenuTemplate(template: TangentMenuItemConstructorOptions[]) {
	const newTemplate: TangentMenuItemConstructorOptions[] = []
	let lastAddedItem: TangentMenuItemConstructorOptions = null

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

		if (Array.isArray(item.submenu)) {
			item.submenu = cleanMenuTemplate(item.submenu)
		}

		newTemplate.push(item)
		lastAddedItem = item
	}

	return newTemplate
}