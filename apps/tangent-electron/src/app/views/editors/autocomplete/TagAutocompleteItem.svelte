<script lang="ts">
import { ChildList, childrenToHTML } from 'common/annotations/nodeAnnotations';
import { annotateMatchText } from 'common/search';
import type { TagOption } from './TagAutocompleter'

export let option: TagOption
export let seperator = '/'

$: content = buildContent(option, seperator)
function buildContent(option: TagOption, seperator: string) {
	let children: ChildList = [option.node.names.join(seperator)]
	if (option.match) {
		children = annotateMatchText(option.match, children)
	}
	return childrenToHTML(children)
}

</script>

<span class="tag">
	#{@html content}
</span>

<style lang="scss">
.tag {
	display: inline-flex;
}
</style>
