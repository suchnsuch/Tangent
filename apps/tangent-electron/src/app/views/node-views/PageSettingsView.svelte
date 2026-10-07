<script lang="ts">
import { getContext } from 'svelte'
import paths from 'common/paths'
import type { SelectPathOptions } from 'common/WindowApi'
import type { Workspace } from 'app/model'
import type PageViewState from 'app/model/nodeViewStates/PageViewState'
import SettingView from '../System/SettingView.svelte'

const workspace = getContext('workspace') as Workspace

let {
	state
} : {
	state: PageViewState
} = $props()

let settings = $derived(state.settings)
let pageNote = $derived(state.note)

let pathPlaceholder = $derived.by(() => {
	if (pageNote && $pageNote) {
		return paths.relative(state.parent.node.path, $pageNote.path)
	}
	return 'Select Path…'
})

function getSelectPathArgs(value) {
	let base: SelectPathOptions = {
		fileTypes: '.md'
	}

	if (typeof value === 'string') {
		base.initialPath = paths.resolve(paths.join(state.parent.node.path, value))
	}

	return base
}

function processSelectedPath(path: string) {
	const relativeNode = workspace.directoryStore.pathToRelativePath(state.parent.node.path)
	if (relativeNode !== false)
		return paths.relative(relativeNode, path)
	return path
}
</script>

<SettingView
	setting={settings.pagePath}
	display="inline"
	inputClass="arrowNavigate"
	showReset={false}
	placeholder={pathPlaceholder}

	{getSelectPathArgs}
	{processSelectedPath}
/>
