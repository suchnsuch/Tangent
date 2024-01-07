<script lang="ts">
import type CardsViewState from 'app/model/nodeViewStates/CardsViewState'
import SettingView from '../System/SettingView.svelte'

export let state: CardsViewState
$: settings = state.settings
</script>

<SettingView
	setting={settings.sorting.sortKey}
	name="Sort By"
	display="inline"
	form="select" />
<SettingView
	setting={settings.sorting.sortOrder}
	name="Order"
	display="inline"
	form="select" />
<SettingView
	display="inline"
	setting={settings.showWordCount}/>
