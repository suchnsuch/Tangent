<script lang="ts">
import { getContext } from 'svelte'
import type { Workspace } from 'app/model'
import type { ContextMenuConstructorOptions } from 'app/model/menus'
import type { BaseSetViewState } from 'app/model/nodeViewStates/SetViewState'
import PopUpButton from 'app/utils/PopUpButton.svelte'
import type { LensSettings, LensSettingsType } from 'common/settings/LensSettings'

const workspace = getContext('workspace') as Workspace

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

let renameTarget: LensSettings = $state(null)
let renameElement: HTMLInputElement = $state(null)
let renameText: string = $state(null)

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
			baseName = newName.substring(0, match.index).trimEnd()
			counter = parseInt(match[0])
		}

		do {
			counter++
			newName = `${baseName} ${counter}`
		} while (hasName(newName))
	}

	newLens.name.value = newName

	settingsList.add(newLens)
	defaultLens.set(newLens.name.value)
}

function setCurrentLens(lens: LensSettings) {
	$defaultLens = lens.name.value
}

function startRenaming(lens: LensSettings) {
	setCurrentLens(lens)
	renameTarget = lens
	renameText = lens.name.value
}

$effect(() => {
	if (renameElement) {
		renameElement.focus()
		renameElement.select()
	}
})

function onRenameKeydown(event: KeyboardEvent) {
	if (event.key === 'Enter') {
		event.preventDefault()
		const trimmed = renameText.trim()
		if (trimmed) {
			renameTarget.name.set(trimmed)
			$defaultLens = trimmed
		}
		renameElement?.blur()
	}
	else if (event.key === 'Escape') {
		event.preventDefault()
		renameElement?.blur()
	}
}

function onRenameBlur() {
	renameTarget = null
	renameElement = null
	renameText = null
}

function menuGenerator(): ContextMenuConstructorOptions[] {
	let options: ContextMenuConstructorOptions[] = []

	for (const lens of settingsList) {
		options.push({
			label: lens.name.value,
			type: 'radio',
			checked: lens === $currentSettings,
			click() {
				setCurrentLens(lens)
			},
			submenu: [
				{
					label: 'Rename',
					toolTip: `Renames the "${lens.name.value}" Lens.`,
					click() {
						startRenaming(lens)
					}
				},
				{ type: 'separator' },
				{
					label: 'Delete',
					toolTip: `Deletes the "${lens.name.value}" Lens.`,
					click() {
						workspace.viewState.modal.pushConfirmDialogue({
							title: `Delete "${lens.name.value}"?`,
							message: `Are you sure you want to delete the ${lens.name.value} lens? This cannot be undone.`
						}).then(result => {
							if (result) {
								settingsList.remove(lens)
							}
						})
					}
				}
			]
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
	{#if renameText != null}
		<input type="text"
			bind:this={renameElement}
			bind:value={renameText}
			onkeydown={onRenameKeydown}
			onblur={onRenameBlur}
		/>
	{:else}
		<PopUpButton
			name={displayName}
			template={menuGenerator}
			buttonClass="arrowNavigate"
			placement="bottom-start"
			closeMenuOnClick={true}
			showPopUpIndicator
		/>
	{/if}
{/if}
