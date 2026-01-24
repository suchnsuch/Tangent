<script lang="ts">
import ListViewState from 'app/model/nodeViewStates/ListViewState'
    import SettingView from '../System/SettingView.svelte';

export let state: ListViewState
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
