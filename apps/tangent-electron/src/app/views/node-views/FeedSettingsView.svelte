<script lang="ts">
import type FeedViewState from 'app/model/nodeViewStates/FeedViewState'
import SettingView from '../System/SettingView.svelte'
import DocumentationLink from 'app/utils/DocumentationLink.svelte'

export let state: FeedViewState
$: settings = state.settings
</script>

<SettingView
	setting={settings.sorting.sortKey}
	name="Sort By"
	display="inline"
	form="select"
	inputClass="arrowNavigate"
	showReset={false}
/>
<SettingView
	setting={settings.sorting.sortOrder}
	name="Order"
	display="inline"
	form="select"
	inputClass="arrowNavigate"
	showReset={false}
/>

<SettingView
	setting={settings.startAt}
	display="inline"
	form="select"
	inputClass="arrowNavigate"
	showReset={false}
/>

<span class="spacer"></span>

{#if state?.documentationPage}
	<DocumentationLink pageName={state.documentationPage} />
{/if}
