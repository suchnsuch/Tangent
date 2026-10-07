<script lang="ts">
import { getContext } from 'svelte'
import Setting, { getValue, getDescription, getDisplayName } from 'common/settings/Setting'
import type { SettingType, SettingValue, SettingArrayType, SettingForm } from 'common/settings/Setting'
import type Workspace from 'app/model/Workspace'
import SvgIcon from '../smart-icons/SVGIcon.svelte'
import PopUpButton from 'app/utils/PopUpButton.svelte'
import { tooltip } from 'app/utils/tooltips'
import ShortcutInput from 'app/utils/ShortcutInput.svelte'
import type { SelectPathOptions } from 'common/WindowApi'

const workspace = getContext('workspace') as Workspace

type SettingList = SettingValue<SettingType>[]

let {
	setting,
	name = null,

	showReset = true,
	form: formOverride,
	display = 'block',
	inputClass = '',
	placeholder: placeholderProp,

	getValues = null,
	includeDefault = true,
	getValuesImmediately = false,

	onValidateShortcut = null,

	getSelectPathArgs, processSelectedPath
} : {
	setting: Setting<SettingType, SettingType> | Setting<SettingType, SettingType[]>
	name?: string

	showReset?: boolean
	form?: SettingForm
	display?: 'block' | 'inline'
	inputClass?: string
	placeholder?: string

	getValues?: () => Promise<SettingList>
	includeDefault?: boolean
	getValuesImmediately?: boolean

	onValidateShortcut?: (shortcut: string) => string

	getSelectPathArgs?: (value: SettingType | SettingType[]) => Omit<SelectPathOptions, 'mode' | 'allowExternal' | 'selectMultiple'>
	processSelectedPath?: (selectedPath: string) => string
} = $props()

let form = $derived(formOverride ?? setting.form)
let placeholder = $derived(placeholderProp ?? setting.placeholder)

let procuredValues: SettingList = $state(null)
let hasProcuredValues = false

// svelte-ignore state_referenced_locally
if (getValues) {
	if (setting.defaultValue === setting.value) {
		if (Array.isArray(setting.value)) {
			procuredValues = setting.value
		}
		else {
			procuredValues = [setting.value]
		}
	}
	else {
		if (!Array.isArray(setting.defaultValue) && !Array.isArray(setting.value)) {
			procuredValues = [setting.defaultValue, setting.value]
		}
		else if (Array.isArray(setting.defaultValue) && Array.isArray(setting.value)) {
			procuredValues = [...setting.defaultValue, ...setting.value]
		}
	}

	if (getValuesImmediately) procureValues()
}

function procureValues() {
	if (getValues && !hasProcuredValues) {
		hasProcuredValues = true
		getValues().then(list => {
			if (includeDefault && !list.includes('')) {
				list.splice(0, 0, '');
			}
			procuredValues = list
		}).catch(e => {
			console.error(e)
			hasProcuredValues = false
		})
	}
}

function multiItemDisplay(items: SettingArrayType, sourceItems: SettingList) {
	let result = ''

	for (let index = 0; index < items.length; index++) {
		const item = items[index]
		const source = sourceItems.find(i => getValue(i) === item)
		console.log({item, source})
		result += getDisplayName(source)
		if (index < items.length - 1) {
			result += ', '
		}
	}

	return result || 'Default'
}

function selectPath(event: MouseEvent) {
	let args: SelectPathOptions = {
		title: `Select ${setting.name}`,
		message: setting.description,
	}

	if (getSelectPathArgs) {
		const additional = getSelectPathArgs($setting)
		if (additional) {
			Object.assign(args, additional)
		}
	}

	args.mode = setting.form as any // These should align

	workspace.api.file.selectPath(args).then(path => {
		if (path !== undefined) {
			path = processSelectedPath ? processSelectedPath(path) : path
			$setting = (path ?? '') as any
		}
	})
}

function displayMin(value: number) {
	const range = setting.range
	if (range.softMin) {
		if (value >= range.softMin) {
			return range.softMin
		}
		else if (value > range.min) {
			return value
		}
	}
	return range.min
}

function displayMax(value: number) {
	const range = setting.range
	if (range.softMax) {
		if (value <= range.softMax) {
			return range.softMax
		}
		else if (value < range.max) {
			return value
		}
	}
	return range.max
}

let effectiveValueList = $derived(getValues ? procuredValues : setting.validValues)

let softValue: any = $state()
$effect.pre(() => {
	softValue = $setting
})

function applyValue(value) {
	$setting = value
}

function applySoftValue(event: Event) {
	if (event instanceof KeyboardEvent) {
		if (event.key !== 'Enter') return
		event.preventDefault()
	}
	setting.value = softValue
	softValue = setting.value
}

function headerClick(event: MouseEvent) {
	if (typeof setting.value === 'boolean') {
		setting.value = !setting.value 
	}
}

function toggleItem(item) {
	const value = getValue(item)
	if (Array.isArray($setting)) {
		// Lordy, hacks
		if ($setting.includes(value)) {
			const filtered = $setting.filter(i => i !== value)
			$setting = filtered as any 
		}
		else {
			$setting = [...$setting, value] as any
		}
	}
	else {
		console.error('not supported (yet?)')
	}
}
</script>

<main class={'SettingView ' + display}>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<h2
		use:tooltip={setting.description}
		onclick={headerClick}
	>{@html name ?? setting.name}</h2>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="value grow"
		onmouseover={procureValues}
		onfocus={procureValues}
	>
		{#if effectiveValueList}
			{#if Array.isArray($setting)}
				<div class="range">
					<PopUpButton name={multiItemDisplay($setting, effectiveValueList)} buttonClass="grow">
						{#snippet menu()}
							{#each effectiveValueList as item}
								<label>
									<input onclick={() => toggleItem(item)} type="checkbox" checked={($setting as SettingArrayType).includes(getValue(item))} />
									<span>{getDisplayName(item) || 'Default'}</span>
								</label>
							{/each}
						{/snippet}
					</PopUpButton>
				</div>
			{:else}
				{#if form === 'select'}
					<select
						bind:value={$setting}
						use:tooltip={setting.description}
						class={inputClass}
					>
						{#each effectiveValueList as item}
							<option value={getValue(item)}>{getDisplayName(item) || 'Default'}</option>
						{/each}
					</select>
				{:else}
					<div class="values buttonGroup grow">
						{#each effectiveValueList as validValue}
							<button class:active={getValue(validValue) === $setting}
								use:tooltip={getDescription(validValue)}
								class={"grow " + inputClass}
								onclick={() => applyValue(getValue(validValue))}>
								{getDisplayName(validValue)}
							</button>
						{/each}
					</div>
				{/if}
			{/if}
		{:else if typeof $setting === 'number' && setting.range}
			<div class="range group" use:tooltip={setting.description}>
				<input type="number"
					bind:value={softValue}
					min={setting.range.min}
					max={setting.range.max}
					class={inputClass}
					{placeholder}
					onblur={applySoftValue}
					onkeydown={applySoftValue}/>
				<input 
					type="range"
					class={"grow " + inputClass}
					{placeholder}
					min={displayMin($setting)}
					max={displayMax($setting)}
					step={setting.range.step ?? .01}
					bind:value={$setting}/>
			</div>
		{:else if typeof $setting === 'string'}
			<div class="buttonGroup grow" use:tooltip={setting.description}>
				{#if form === 'textarea'}
					<textarea
						bind:value={$setting}
						class={"grow " + inputClass}
						spellcheck="true"
						rows="3"
						{placeholder}
						></textarea>
				{:else if form === 'shortcut'}
					<div style="display: flex; align-items: center;">
						<ShortcutInput
							bind:value={$setting}
							validate={onValidateShortcut}
							class={inputClass}
						/>
					</div>
				{:else}
					<input type="text"
						class={"grow " + inputClass}
						bind:value={$setting}
						placeholder={placeholder ?? (setting.form === 'folder' ? 'Workspace Root' : '')}
					/>
					{#if setting.form === 'file' || setting.form === 'folder' || setting.form === 'path'}
						<button onclick={selectPath} class={"inputButton " + inputClass}>
							<SvgIcon ref={'folder.svg#folder'} size={16} />
						</button>
					{/if}
				{/if}
			</div>
		{:else if typeof $setting === 'boolean'}
			<input
				type="checkbox"
				use:tooltip={setting.description}
				bind:checked={$setting}
				class={inputClass}
				onclick={e => e.stopPropagation()}
			/>
			<span class="spacer"></span>
		{/if}
		{#if showReset}
			<button
				use:tooltip={"Reset \"" + setting.name + "\" to its default value."}
				class={"reset subtle " + inputClass}
				onclick={() => $setting = setting.defaultValue}
				disabled={$setting === setting.defaultValue}
			><SvgIcon size={20} ref="reset.svg#arc"/></button>
		{/if}
	</div>
</main>

<style lang="scss">
main {
	display: flex;
	flex-wrap: wrap;
	align-items: center;

	&.block {
		&:not(:first-child) {
			margin-top: .5em;
		}
		&:not(:last-child) {
			margin-bottom: .5em;
		}
	}

	&.inline {
		display: inline-flex;
		margin: .25em 0;
	}
}
h2 {
	font-size: 1.0em;
	font-weight: normal;
	margin: 0;
	line-height: 1.25em;
	padding: .25em;
	white-space: pre;
	.inline & {
		padding-right: .25em;
	}
}

.grow {
	flex-grow: 1;
}

.value {
	display: flex;
	select {
		width: 100%;
	}
	input[type="checkbox"] {
		position: relative;
		//top: 2px;
	}
}

.iconButton {
	display: flex;
	align-items: center;
}

.range {
	flex-grow: 1;
	display: flex;
	align-items: center;

	input[type="number"] {
		min-width: 4em;
	}

	input[type="range"] {
		flex-grow: 1;
		margin: 0 .25em;
	}

	:global(.grow) {
		flex-grow: 1;
	}
}

button.reset {
	padding: 2px;
	margin-left: 2px;

	&:disabled {
		visibility: hidden;
	}
}

</style>
