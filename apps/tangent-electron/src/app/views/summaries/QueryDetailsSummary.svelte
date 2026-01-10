<script lang="ts">
import { pluralize } from 'common/plurals'
import type QueryViewState from 'app/model/nodeViewStates/QueryViewState'

interface Props {
	state: QueryViewState
}

let {
	state: queryViewState
}: Props = $props()

let children = $derived(queryViewState.nodes)
let stats = $derived.by(() => {
	return pluralize($children.length, 'Found $$ Items', 'Found One Item', 'Found Nothing')
})

</script>
<span>{stats}</span>