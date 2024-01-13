<script lang="ts">
import type { ThreadHistoryItem } from 'common/dataTypes/Session'
import type Session from 'common/dataTypes/Session'

export let session: Session
export let direction: 1 | -1 = 1

export let limit = 10

$: index = session.threadIndex
$: history = session.threadHistory

$: historyList = getHistoryList($history, $index)
function getHistoryList(history: ThreadHistoryItem[], index: number) {
	let result: ThreadHistoryItem[] = []

	let steps = 1

	while (steps <= limit && index >= 0 && index < history.length) {
		result.push(history[index])
		index += direction
		steps++
	}

	return result
}

function onItemClicked(event: MouseEvent, item: ThreadHistoryItem) {
	session.setHistory(item)
}

</script>

<main>
	{#each historyList as item}
		{@const current = item.currentNode}
		{@const thread = item.thread}
		<button
			class="subtle"
			on:click={e => onItemClicked(e, item)}
		>
			{#each thread as node}
				<span class="node"
					class:current={current === node}
				>{node?.name}</span>
			{:else}
				<span class="empty">Empty</span>
			{/each}
		</button>
	{/each}
</main>

<style lang="scss">
button {
	display: flex;
	width: 100%;
	flex-direction: row;
	align-content: stretch;

	border-left: 4px solid transparent;
	border-radius: 0;

	&:first-child {
		border-left-color: var(--accentBackgroundColor);
	}
}

.node {
	font-size: 90%;

	&.current {
		color: var(--accentTextColor);
	}
	&:not(:last-child)::after {
		content: "➝";
		margin: 0 .2em;
	}
}
</style>
