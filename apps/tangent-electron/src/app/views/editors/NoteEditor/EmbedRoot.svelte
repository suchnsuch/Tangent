<script lang="ts">
import { createEventDispatcher } from 'svelte'
import type { TreeNode } from 'common/trees'
import { isExternalLink } from 'common/links'
import type { Workspace } from 'app/model'
import { EmbedType, getEmbedType } from 'common/embedding'
import type { HrefFormedLink } from 'common/indexing/indexTypes'
import type EmbedFile from 'app/model/EmbedFile'
import { ForwardingStore } from 'common/stores'

type Form = {
	mode: 'error'
	message: string
} | {
	mode: 'image',
	src: string
}

const formDispatcher = createEventDispatcher<{ 'form': Form }>()

export let link: HrefFormedLink
export let block: boolean
export let workspace: Workspace

// Normally these wouldn't be exports, but I want accessors for them
export let form: Form = null

$: nodeHandle = workspace?.getHandle(link)

$: updateFromHref(link)
function updateFromHref(link: HrefFormedLink) {
	if (link) {
		if (isExternalLink(link.href)) {
			form = {
				mode: 'image',
				src: link.href
			}
		}
	}
	else {
		error('No valid link found!')
	}
}

$: formDispatcher('form', form)

$: onNodeHandleChanged(nodeHandle ? $nodeHandle : null)
function onNodeHandleChanged(value: string | TreeNode | TreeNode[]) {
	if (typeof value === 'string') {
		// This occurs with a bad md link
		// Assume this is an image embed from outside the directory
		form = {
			mode: 'image',
			src: link.href
		}
	}
	else if (Array.isArray(value)) {
		if (value.length > 0) {
			error('Could not resolve the link to a single file. Be more specific.')
		}
		else {
			error('Could not resolve the link. Is it correct?')
		}
	}
	else if (value.meta?.virtual) {
		error('Cannot embed a virtual file: it doesn\'t exist!')
	}
	else {
		switch (getEmbedType(value)) {
			case EmbedType.Image:
				form = {
					mode: 'image',
					src: (value as EmbedFile).cacheBustPath
				}
				break
			default:
				error(`Invalid file type. Cannot embed a "${value.fileType}" file.`)
				break
		}
	}
}

function error(message: string) {
	form = {
		mode: 'error',
		message
	}
}

function imageStyle(customizations: string) {

	let style = 'max-width: 100%; border-radius: 1px;'
	if (block) {
		style += 'margin: 0 auto .5em;'
	}

	if (customizations) {
		for (let part of customizations.split(/\s+/).map(p => p.trim())) {
			const match = part.match(/((\d+)(x(\d+))?)|((left)|(right))/i)
			if (match) {
				if (match[2]) {
					const width = parseInt(match[1])
					if (width >= 10) {
						style += `width: ${width}px;`
					}
				}
				if (match[4]) {
					const height = parseInt(match[4])
					if (height >= 10) {
						style += `height: ${height}px;`
					}
				}
				if (match[5]) {
					const form = match[5].toLowerCase()
					style += `float: ${form};`
				}
			}
		}
	}

	return style
}
</script>

{#if form.mode === 'error'}
	<span title={form.message}>⚠</span>
{:else if form.mode === 'image'}
	<!-- svelte-ignore a11y-missing-attribute -->
	<img src={form.src} style={imageStyle(link.text)} on:error={e => error('Image not found!')} />
{/if}

<svelte:options accessors={true}/>
