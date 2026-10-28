<script lang="ts">
import LoadingViewState from 'app/model/nodeViewStates/LoadingViewState'

export let state: LoadingViewState
</script>

<main>
	<p>Loading "{state.parent.node.name}"…</p>
	<p></p>
</main>

<style>
main {
	text-align: center;
	margin-top: 40vh;
}

p {
	font-size: 200%;
	font-weight: 200;
	color: var(--deemphasizedTextColor);
}
</style>