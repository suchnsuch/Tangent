<script lang="ts">
import { pluralize } from 'common/plurals'
import type TagViewState from 'app/model/nodeViewStates/TagViewState'

interface Props {
	state: TagViewState
}

let {
	state: tagViewState
}: Props = $props()

let children = $derived(tagViewState.nodes)
let stats = $derived.by(() => {
	return pluralize($children.length, 'Referenced by $$ Items', 'Referenced by One Item', 'Not Referenced')
})

</script>
<span>{stats}</span>