<script lang="ts">
import { shortestDayDate, simpleTimestamp } from 'common/dates';
import type { TreeNode } from 'common/trees';
import { iconForNode } from 'common/icons';
import { annotateMatchText, SearchMatchResult } from 'common/search';

import { getContext } from 'svelte';

import type { Workspace } from '../../model/index'
import SvgIcon from '../smart-icons/SVGIcon.svelte';
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

	const extenstion = paths.extname(relativePath)
	const extenstionStart = relativePath.length - extenstion.length
	
	let showExtension = showFileType && extenstion.startsWith('.')

	const indices = (match as any)?.indices
	if (indices && extenstion.startsWith('.')) {
		for (let index = 1; index < indices.length; index++) {
			if (indices[index][1] > extenstionStart) {
				showExtension = true
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
			}, [dirname.length + 1, relativePath.length])
		}
		else {
			annotations = applyAnnotation(annotations, {
				className: 'name'
			}, [0, relativePath.length])
		}
	}

	if (showExtension) {
		annotations = applyAnnotation(annotations, {
			className: 'fileType'
		}, [extenstionStart, relativePath.length])
	}

	if (match) {
		annotations = annotateMatchText(match, annotations)
	}

	return childrenToHTML(annotations)
}

</script>

<div class="NodeLine">
	{#if showIcon}<SvgIcon ref={iconForNode(node)} size="1em" />{/if}
	{#if nameMatch?.type === 'header'}<span class="headerNoteName">{node.name} →</span>{/if}
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

.path :global(.directory), .path :global(.fileType), .date, .headerNoteName {
	// When highlighted, this looks better as it adjusts to the background color
	opacity: 60%;
	font-size: 80%;
	line-height: 125%;
}

.path :global(.directory) {
	margin-right: .125em;
}

.date {
	white-space: nowrap;
}
</style>