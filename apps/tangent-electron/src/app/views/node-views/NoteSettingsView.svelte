<script lang="ts">
import { tick } from 'svelte'
import { NoteViewState } from 'app/model/nodeViewStates'
import SvgIcon from '../smart-icons/SVGIcon.svelte'
import { focusLayer } from 'app/utils'
import WorkspaceFileHeader from 'app/utils/WorkspaceFileHeader.svelte'

export let state: NoteViewState

$: annotations = state.annotations
$: annotationIndex = state.annotationIndex
$: search = state.search

$: if (search && $search?.enabled) {
	tick().then(() => {
		if (searchField) {
			searchField.focus()
		}
	})
}

let searchField: HTMLInputElement

function openSearch() {
	state.setSearch()
}

function closeSearch() {
	state.search.update(s => {
		return {
			...s,
			enabled: false
		}
	})
}

function onSearchKeydown(event: KeyboardEvent) {
	if (event.key === 'Escape') {
		event.preventDefault()
		closeSearch()
		return
	}
	if (event.key === 'Enter' || event.key == 'Tab') {
		event.preventDefault()
		event.stopPropagation()
		if (event.shiftKey) {
			state.annotationIndex.update(i => {
				i--
				if (i < 0) {
					return state.annotations.value.length - 1
				}
				return i
			})
		}
		else {
			state.annotationIndex.update(i => {
				i++
				if (i === state.annotations.value.length) {
					return 0
				}
				return i
			})
		}
		return
	}
}

function onSearchChange(event) {
	state.setSearch((event.target as HTMLInputElement).value)
}
</script>

<div class="lens-settings-row">
	<WorkspaceFileHeader node={state.node} showExtension={true} />
	<span class="spacer"></span>
	<span class="search buttonBar">
		{#if $search?.enabled}
			<span class="buttonGroup">
				<button disabled>
					<SvgIcon size={16} ref="query.svg#query" />
				</button>
				<input bind:this={searchField} class="search arrowNavigate" type="text"
					value={$search.text}
					on:input={onSearchChange}
					on:keydown={onSearchKeydown}
					use:focusLayer={'FileSearch'}
				/>
			</span>
		{:else}
			<button class="subtle arrowNavigate" on:click={openSearch}>
				<SvgIcon size={16} ref="query.svg#query" />
			</button>
		{/if}
		
		{#if $annotations.length > 0}
			<span class="annotation-count">{$annotationIndex + 1}/{$annotations.length}</span>
			<span class="buttonGroup">
				<button class="previous arrowNavigate" on:click={() => $annotationIndex = $annotationIndex == 0 ? $annotations.length - 1 : $annotationIndex - 1}>
					<SvgIcon size={16} ref="arrows.svg#back" />
				</button>
				<button class="next arrowNavigate" on:click={() => $annotationIndex = $annotationIndex == $annotations.length - 1 ? 0 : $annotationIndex + 1}>
					<SvgIcon size={16} ref="arrows.svg#forward" />
				</button>
			</span>
		{:else if $search?.enabled && $search.text}
			<span class="annotation-count none">No Matches</span>
		{/if}
		{#if $search?.enabled || $annotations.length > 0}
			<button class="subtle arrowNavigate" on:click={closeSearch}>
				<SvgIcon size={16} ref="close.svg#close" />
			</button>
		{/if}
	</span>
</div>

<style lang="scss">
.annotation-count {
	color: var(--deemphasizedTextColor);
	display: inline-flex;
	align-items: center;
	padding: 0 .5em;
}

.search {
	gap: .5em;
}

</style>
