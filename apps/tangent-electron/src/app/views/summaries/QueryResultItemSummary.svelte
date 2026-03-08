<script lang="ts">
import { getContext } from "svelte"
import { getNode, getPreview, type NodePreview, type TreeNodeReference } from "common/nodeReferences"
import { implicitExtensionsMatch } from "common/fileExtensions"
import type { Workspace } from "app/model"
import NodeLine from "./NodeLine.svelte"
import { applyAnnotation, childrenToHTML, type ChildList } from "common/annotations/nodeAnnotations"

let workspace = getContext('workspace') as Workspace

let {
	reference
}: {
	reference: TreeNodeReference
} = $props()

let node = $derived(getNode(reference, workspace.directoryStore))
let preview = $derived(buildPreviewContent(reference))

function buildPreviewContent(reference: TreeNodeReference) {
	if (!reference) return null
	
	const preview = getPreview(reference, 0)
	if (!preview) return null

	let content: string
	let start = 0
	if (typeof preview === 'string') {
		content = preview
	}
	else {
		content = preview.content
		start = preview.start
	}

	let annotations: ChildList = [ content ]

	if (reference.annotations) {
		for (const annotation of reference.annotations) {
			annotations = applyAnnotation(annotations, {
				className: 'match-highlight'
			}, [annotation.start - start, annotation.end - start])
		}
	}

	return childrenToHTML(annotations)
}

</script>

<NodeLine {node}
	showFileType={!node.fileType.match(implicitExtensionsMatch)}
	showModDate={true}/>
{#if preview}
	<div class="preview">{@html preview}</div>
{/if}

<style lang="scss">
.preview {
	font-size: 75%;
	margin: .5em 0;
	margin-left: 1em;

	padding: .5em 1em;

	background-color: var(--noteBackgroundColor);
	border-radius: var(--inputBorderRadius);
}

</style>