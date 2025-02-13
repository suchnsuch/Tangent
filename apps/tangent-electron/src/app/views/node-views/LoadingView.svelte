<script lang="ts">
import LoadingViewState from 'app/model/nodeViewStates/LoadingViewState'

export let state: LoadingViewState
</script>

<main>
	<p>Loading {state.parent.node.name}</p>
	<p></p>
</main>

<style>
p {
	font-size: 200%;
	color: var(--deemphasizedTextColor);
}
</style>