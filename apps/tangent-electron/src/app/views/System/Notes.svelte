<script lang="ts">
import { getContext } from 'svelte'
import { getLangNameFromCode } from 'language-name-map'
import type Workspace from 'app/model/Workspace'

import SettingView from './SettingView.svelte'
import { isMac } from 'common/platform'

let workspace = getContext('workspace') as Workspace
let settings = workspace.settings

async function getSpellCheckLanguages() {
	console.log('Getting spellcheck languages')
	const langs = await workspace.api.system.getAllLanguages()

	const items = langs.map(l => {

		const match = l.match(/(\w+)(-(.+))?/)
		const name = getLangNameFromCode(match[1])

		let displayName = name?.native

		if (name?.native !== name?.name) {
			displayName += ' – ' + name?.name
		}

		if (match[2]) {
			displayName += ' – ' + match[3]
		}

		return {
			value: l,
			displayName
		}
	})

	console.log({langs, items})
	
	return items
}

</script>

<main>
	<h2>Appearance</h2>
	<div class="settingsGroup">
		<SettingView setting={settings.noteFont}
			getValues={workspace.api.system.getAllFonts} />
		<SettingView setting={settings.noteFontSize} name="Font Size" />
		<SettingView setting={settings.lineHeight} />
		<SettingView setting={settings.noteWidthMax} />
		<SettingView setting={settings.noteMargins} />
	</div>
	<div class="settingsGroup">
		<SettingView setting={settings.fixedTitle} />
		<SettingView setting={settings.hangingHeaders} />
		<SettingView setting={settings.cardViewCardsHoldAltToScroll} name="Require Alt to Scroll Cards" />
		<SettingView setting={settings.crossOutFinishedTodos} />
	</div>

	<h2>Editing</h2>
	<div class="settingsGroup">
		<SettingView setting={settings.italicsCharacters} />
		<SettingView setting={settings.boldCharacters} />
		<SettingView setting={settings.allowInterTextUnderscoreFormatting} />
		<SettingView setting={settings.smartParagraphBreaks} />
		<SettingView setting={settings.enableSpellCheck} />
		{#if !isMac}
			<SettingView setting={settings.spellCheckLanguages}
				includeDefault={false}
				getValuesImmediately={true}
				showReset={true}
				getValues={getSpellCheckLanguages}/>
		{/if}
	</div>

	<h2>Links</h2>
	<div class="settingsGroup">
		<SettingView setting={settings.linkCursor} />
		<SettingView setting={settings.noteLinkFollowBehavior} />
		<SettingView setting={settings.linkClickPaneBehavior} />
		<SettingView setting={settings.rawLinksAutoEmbed} />
	</div>

	<h2>Code</h2>
	<div class="settingsGroup">
		<SettingView setting={settings.noteCodeFont}
			getValues={workspace.api.system.getAllFonts}/>
		<SettingView setting={settings.noteCodeInlineLightTheme}
			getValues={workspace.api.theme.getCodeThemes}
			includeDefault={false}/>
		<SettingView setting={settings.noteCodeBlockLightTheme}
			getValues={workspace.api.theme.getCodeThemes}
			includeDefault={false}/>
		<SettingView setting={settings.noteCodeInlineDarkTheme}
			getValues={workspace.api.theme.getCodeThemes}
			includeDefault={false}/>
		<SettingView setting={settings.noteCodeBlockDarkTheme}
			getValues={workspace.api.theme.getCodeThemes}
			includeDefault={false}/>
		<SettingView setting={settings.letCodeExpand} />
	</div>
</main>
	