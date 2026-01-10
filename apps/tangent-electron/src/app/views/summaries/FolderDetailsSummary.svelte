<script lang="ts">
import { pluralize } from 'common/plurals'
import type { FolderViewState } from 'app/model/nodeViewStates'

interface Props {
	state: FolderViewState
}

let {
	state: folderViewState
}: Props = $props()

let children = $derived(folderViewState.nodes)
let stats = $derived.by(() => {
	return pluralize($children.length, '$$ Children', '$$ Child', 'No Children')
})

</script>
<span>{stats}</span>