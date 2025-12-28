<script lang="ts">
import type LensViewState from 'app/model/nodeViewStates/LensViewState'
export let state: LensViewState
</script>

<article>
	<h1>Cannot present "{state.parent.node.name}"</h1>
	<p>Tangent cannot display "{state.parent.node.path}".</p>
	<p>The file type may not be supported, or perhaps the file does not exist.</p>
</article>

<style lang="scss">
article {
	margin: 8rem auto;
	color: var(--deemphasizedTextColor);
	max-width: 30rem;
}
</style>