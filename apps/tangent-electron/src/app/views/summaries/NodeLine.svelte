<script lang="ts">
import { shortestDayDate, simpleTimestamp } from 'common/dates';
import type { TreeNode } from 'common/trees';
import { annotateMatchText, SearchMatchResult } from 'common/search';

import { getContext } from 'svelte';

import type { Workspace } from '../../model/index'
import NodeIcon from '../smart-icons/NodeIcon.svelte';
import paths, { dirname, normalizeSeperators } from 'common/paths';
import { applyAnnotation, ChildList, childrenToHTML } from 'common/annotations/nodeAnnotations';
import { isTagTreeNode } from 'common/indexing/TagNode';
import { tooltip } from 'app/utils/tooltips'

const workspace = getContext('workspace') as Workspace

export let node: TreeNode
export let relativeTo: string | TreeNode = null
export let showIcon = true
export let showFileType = false
export let showModDate = false
export let highlightName = true
export let shrinkNonHighlights = true
export let nameMatch: SearchMatchResult = null

$: content = getContent(node, relativeTo, showFileType, nameMatch)
function getContent(node: TreeNode, relativeTo: string | TreeNode, showFileType: boolean, match: SearchMatchResult): string {
	
	let relativePath: string

	if (!node) return ''

	if (node.fileType === 'tag' && isTagTreeNode(node)) {
		// This is a bit of a hack, but I want to see the real cases
		relativePath = node.names.join('/')
	}
	else if (match) {
		// Pretty large assumption here; rolling with it
		relativePath = match.input
	}
	else if (relativeTo && typeof relativeTo !== 'string') {
		const result = paths.getChildPath(relativeTo.path, node.path)
		if (result !== false) {
			// Force windows paths to normal paths
			relativePath = normalizeSeperators(result, '/')
		}
	}
	
	if (!relativePath) {
		const foundRelativePath = workspace.directoryStore.pathToRelativePath(node.path)
		if (foundRelativePath === false) {
			console.error('Could not get a relative path for', node)
			return node.name
		}
		relativePath = foundRelativePath

		if (typeof relativeTo === 'string') {
			const relativeResult = paths.getChildPath(relativeTo, relativePath)
			if (relativeResult !== false) {
				relativePath = relativeResult
			}
		}

		// Force windows paths to normal paths
		relativePath = normalizeSeperators(relativePath, '/')
	}

	let extension = paths.extname(relativePath)
	const extenstionStart = relativePath.length - extension.length
	const extensionHeaderIndex = extension.lastIndexOf('#')
	if (extensionHeaderIndex >= 0) {
		// Strip off the header
		extension = extension.substring(0, extensionHeaderIndex)
		relativePath = relativePath.substring(0, extenstionStart + extensionHeaderIndex) + '→' + relativePath.substring(extenstionStart + extensionHeaderIndex + 1)
	}
	const extensionEnd = extenstionStart + extension.length
	
	let showExtension: false|true|'highlighted' = showFileType && extension.startsWith('.') || extensionHeaderIndex >= 0

	const indices = (match as any)?.indices
	if (indices && extension.startsWith('.')) {
		for (let index = 1; index < indices.length; index++) {
			if (indices[index][1] > extenstionStart && indices[index][0] < extensionEnd) {
				showExtension = 'highlighted'
				break
			}
		}
	}

	relativePath = showExtension ? relativePath : relativePath.substring(0, extenstionStart)

	let annotations: ChildList = [ relativePath ]

	if (highlightName) {
		const dirName = paths.dirname(relativePath)
		if (dirName !== '.') {
			annotations = applyAnnotation(annotations, {
				className: 'directory'
			}, [0, dirName.length + 1])
			annotations = applyAnnotation(annotations, {
				className: 'name'
			}, [dirname.length + 1, extenstionStart])
		}
		else {
			annotations = applyAnnotation(annotations, {
				className: 'name'
			}, [0, extenstionStart])
		}
	}

	if (showExtension) {
		annotations = applyAnnotation(annotations, {
			className: 'fileType' + (showExtension === 'highlighted' ? ' highlighted' : '')
		}, [extenstionStart, extensionEnd])
	}

	if (extensionHeaderIndex >= 0) {
		annotations = applyAnnotation(annotations, {
			className: 'headerHash'
		}, [extenstionStart + extensionHeaderIndex, extenstionStart + extensionHeaderIndex + 1])
		annotations = applyAnnotation(annotations, {
			className: 'headerName'
		}, [extenstionStart + extensionHeaderIndex + 1, relativePath.length])
	}

	if (match) {
		annotations = annotateMatchText(match, annotations)
	}

	return childrenToHTML(annotations)
}

</script>

<div class="NodeLine" class:header={nameMatch?.type === 'header'} class:shrinkNonHighlights>
	{#if showIcon}<NodeIcon {node} size="1em" />{/if}
	<span class="path" class:highlightName>{@html content}</span>
	{#if showModDate}
		<span class="date" use:tooltip={"Last modified " + simpleTimestamp(node.modified)}>{shortestDayDate(node.modified)}</span>
	{/if}
</div>

<style lang="scss">
div {
	display: flex;
	align-items: center;
	gap: .4em;

	--iconStroke: var(--deemphasizedTextColor);
	--iconFill: var(--backgroundColor);
}

div > :global(svg) {
	flex-shrink: 0;
}

.path {
	flex-grow: 1;
	&.highlightName {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
	}
}

.path :global(.directory), .path :global(.fileType), .path :global(.headerHash), .date {
	// When highlighted, this looks better as it adjusts to the background color
	opacity: 60%;

	.shrinkNonHighlights & {
		font-size: 80%;
		line-height: 125%;
	}
}

.NodeLine.header :global(.name) {
	// When highlighted, this looks better as it adjusts to the background color
	opacity: 60%;
}
.NodeLine.header.shrinkNonHighlights :global(.name) {
	font-size: 80%;
	line-height: 125%;	
}

.path :global(.headerHash) {
	display: inline-block;
	padding: 0 .2em;
}

.path :global(.fileType) {
	align-self: last baseline;
}

.path :global(.directory) {
	margin-right: .125em;
}

.date {
	white-space: nowrap;
}
</style>