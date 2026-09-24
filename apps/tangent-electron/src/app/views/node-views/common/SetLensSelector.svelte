<script lang="ts">
import type { ContextMenuConstructorOptions } from 'app/model/menus'
import type { BaseSetViewState } from 'app/model/nodeViewStates/SetViewState'
import PopUpButton from 'app/utils/PopUpButton.svelte'
import type { LensSettings, LensSettingsType } from 'common/settings/LensSettings'


let {
	viewState
} : {
	viewState: BaseSetViewState
} = $props()

let info = $derived(viewState.info)
let settingsList = $derived(info && $info.lensSettings)
let currentSettings = $derived(viewState.currentLensSettings)
let currentSettingsName = $derived(currentSettings && typeof $currentSettings !== 'string' && $currentSettings.name)
let defaultLens = $derived(info && $info.defaultLens)

let displayName = $derived.by(() => {
	if (!currentSettings) {
		return 'Select Settings'
	}
	if ($currentSettings === 'loading') return 'Loading…'
	return $currentSettingsName
})

function createNewLens(type: LensSettingsType) {
	const newLens: LensSettings = new type()

	function hasName(name: string) {
		return settingsList.value.find(i => i.name.value === name) != undefined
	}

	let newName = newLens.name.value?.trim() || 'New Lens'

	if (hasName(newName)) {

		let baseName = newName
		let counter = 0
		const match = newName.match(/\d+$/)
		if (match) {
			baseName = newName.substring(match[0].length).trimEnd()
			counter = parseInt(match[0])
		}

		do {
			counter++
			newName = `${baseName} ${counter}`
		} while (hasName(newName))
	}

	newLens.name.value = newName

	settingsList.add(newLens)
}

function menuGenerator(): ContextMenuConstructorOptions[] {
	let options: ContextMenuConstructorOptions[] = []

	for (const lens of settingsList) {
		options.push({
			label: lens.name.value,
			type: 'radio',
			checked: lens === $currentSettings,
			click() {
				console.log('selecting', lens.name.value)
				$defaultLens = lens.name.value
			}
		})
	}

	options.push({ type: 'separator' })
	
	options.push({
		type: 'submenu',
		label: 'New',
		submenu: [
			...Object.values(settingsList.config.types).map(t => {
				return {
					label: `${t.staticName} Lens`,
					click() {
						return createNewLens(t)
					}
				} satisfies ContextMenuConstructorOptions
			})
		]
	})

	return options
}

</script>

{#if info}
	<PopUpButton
		name={displayName}
		template={menuGenerator}
		buttonClass="arrowNavigate"
		placement="bottom-start"
		closeMenuOnClick={true}
	/>
{/if}
