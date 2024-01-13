<script lang="ts">
import UnhandledViewState from 'app/model/nodeViewStates/UnhandledViewState'

export let state: UnhandledViewState
</script>

<article>
	<h1>Cannot present "{state.node.name}"</h1>
	<p>Tangent cannot display "{state.node.path}".</p>
	<p>The file type may not be supported, or perhaps the file does not exist.</p>
</article>

<style lang="scss">
article {
	margin: 8rem auto;
	color: var(--deemphasizedTextColor);
	max-width: 30rem;
}
</style>