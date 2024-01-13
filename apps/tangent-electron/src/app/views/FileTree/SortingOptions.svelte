<script lang="ts">
import DirectoryView, { sortModes, getSortModeDisplayName } from 'app/model/directoryView'

export let directoryView: DirectoryView

$: currentSortMode = directoryView.sortMode
$: sortQueriesToTop = directoryView.sortQueriesToTop
$: sortFoldersToTop = directoryView.sortFoldersToTop

</script>

<label>Sort By
	<select bind:value={$currentSortMode}>
		{#each sortModes as sortMode }
			<option value={sortMode}>{getSortModeDisplayName(sortMode)}</option>
		{/each}
	</select>
</label>

<label>
	<input type="checkbox" bind:checked={$sortFoldersToTop}/>
	Sort Folders to Top
</label>

<label>
	<input type="checkbox" bind:checked={$sortQueriesToTop}/>
	Sort Queries to Top
</label>

<style lang="scss">
label {
	display: block;
	margin: .5rem 0;

	&:first-child {
		margin-top: 0;
	}
	&:last-child {
		margin-bottom: 0;
	}
}
</style>
