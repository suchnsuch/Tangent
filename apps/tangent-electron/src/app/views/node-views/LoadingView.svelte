<script lang="ts">
import LoadingViewState from 'app/model/nodeViewStates/LoadingViewState'

const {
	// Renamed to not conflict with `$state`
	state: viewState,
	layout = 'fill',
	extraTop = 0,
	extraBottom = 0
} : {
	state: LoadingViewState
	layout?: 'fill' | 'auto'
	extraTop?: number
	extraBottom?: number
} = $props()

// Widths of the fake text lines within each skeleton card
const cardLines = [
	[ '90%', '75%', '85%', '40%' ],
	[ '80%', '90%', '55%' ]
]

// Avoid flashing the skeleton for quick loads
// Long loads are very probably going to be cause by new view infos, defaulting to Cards
let showSkeleton = $state(false)
$effect(() => {
	const timeout = setTimeout(() => showSkeleton = true, 100)
	return () => clearTimeout(timeout)
})
</script>

<div class="LoadingView" class:layout-fill={layout === 'fill'}
	style:padding-top={extraTop + 'px'}
	style:padding-bottom={extraBottom + 'px'}
	aria-busy="true"
	aria-label={`Loading "${viewState.parent.node.name}"`}
>
	{#if showSkeleton}
		<div class="cards">
			{#each cardLines as lines}
				<div class="card" aria-hidden="true">
					<div class="title"></div>
					{#each lines as width}
						<div class="line" style:width={width}></div>
					{/each}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style lang="scss">
// Mirrors the layout of CardsView
.LoadingView {
	padding-top: 3rem;

	&.layout-fill {
		position: absolute;
		inset: 0;

		overflow: hidden;
	}
}

.cards {
	display: grid;
	padding: 1rem;
	gap: 1rem;

	grid-template-columns: repeat(auto-fit, minmax(min(calc(50% - 2rem), calc(26rem)), 1fr));
	grid-auto-rows: min-content;
	grid-auto-flow: row;
}

.card {
	height: 20rem;

	box-sizing: border-box;

	border: 1px solid var(--borderColor);
	background-color: var(--backgroundColor);

	border-radius: var(--borderRadius);

	padding: 1rem;

	opacity: .6;
	&:nth-child(2) {
		opacity: .3;
	}
}

.title, .line {
	background-color: var(--borderColor);
	border-radius: var(--borderRadius);
}

.title {
	width: 60%;
	height: 1.6rem;
	margin-bottom: 1.25rem;
}

.line {
	height: .8rem;
	margin-bottom: .7rem;
}
</style>
