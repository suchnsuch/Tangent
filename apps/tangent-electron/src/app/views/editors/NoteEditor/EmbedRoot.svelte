<script lang="ts">
import { createEventDispatcher } from 'svelte'
import { EmbedType, getEmbedType } from 'common/embedding'
import type { HrefFormedLink } from 'common/indexing/indexTypes'
import type { Workspace } from 'app/model'
import type EmbedFile from 'app/model/EmbedFile'
import { ForwardingStore } from 'common/stores'
import { HandleResult, isNode } from 'app/model/NodeHandle'
import type { UrlData, UrlDataError, WebsiteData } from 'common/urlData'

type Form = {
	mode: 'error'
	message: string
} | {
	mode: 'image'
	src: string 
} | {
	mode: 'audio'
	src: string
} | {
	mode: 'video'
	src: string
} | {
	mode: 'youtube'
	src: string
	title: string
} | {
	mode: 'website'
} & WebsiteData

const formDispatcher = createEventDispatcher<{ 'form': Form }>()

export let link: HrefFormedLink
export let block: boolean
export let workspace: Workspace

// Normally these wouldn't be exports, but I want accessors for them
export let form: Form = null

$: nodeHandle = workspace?.getHandle(link)
$: onNodeHandleChanged(nodeHandle ? $nodeHandle : null)
function onNodeHandleChanged(value: HandleResult) {
	if (!value) {
		error('Handle resolution error')
	}
	else if (typeof value === 'string') {
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
	else if (isNode(value)) {
		if (value.meta?.virtual) {
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
	else if (value.mediaType === 'image') {
		form = {
			mode: 'image',
			src: value.url
		}
	}
	else if (value.mediaType === 'audio') {
		form = {
			mode: 'audio',
			src: value.url
		}
	}
	else if (value.mediaType === 'video') {
		form = {
			mode: 'video',
			src: value.url
		}
	}
	else if (value.mediaType === 'website') {
		form = {
			mode: 'website',
			...value as WebsiteData
		}
	}
	else if (value.mediaType === 'video.other' && 'siteName' in value && value.siteName === 'YouTube') {
		// Explicitly handle youtube embedding
		const youtubePrefix = 'https://www.youtube.com/watch?v='
		const index = value.url.indexOf(youtubePrefix)
		if (index !== -1) {
			let watchCode = value.url.substring(index + youtubePrefix.length)
			const ampIndex = watchCode.indexOf('&')
			if (ampIndex !== -1) {
				watchCode = watchCode.substring(0, ampIndex)
			}

			form = {
				mode: 'youtube',
				src: 'https://www.youtube.com/embed/' + watchCode,
				title: value.title
			}
		}
		else {
			error('Bad youtube link!')
		}
	}
	else if (value.mediaType === 'error') {
		error((value as UrlDataError).message)
	}
	else {
		console.log('unhandled form!', value)
		error('Unhandled form! ' + value.mediaType)
	}
	formDispatcher('form', form)
}

function error(message: string) {
	form = {
		mode: 'error',
		message
	}
}

function getBaseStyle() {
	let style = 'max-width: 100%;'
	if (block) {
		style += 'margin: 0 auto .5em;'
	}
	return style
}

function imageStyle(customizations: string) {

	let style = getBaseStyle() + 'border-radius: 1px;'

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

function websiteStyle(form: WebsiteData) {
	return getBaseStyle()
}

function websiteImageStyle(form: WebsiteData) {
	if (form.images.length) {
		return `background: url("${form.images[0]}"); background-size: cover;`
	}
	return ''
}
</script>

{#if form.mode === 'error'}
	<span title={form.message} class="error">⚠</span>
{:else if form.mode === 'image'}
	<!-- svelte-ignore a11y-missing-attribute -->
	<img src={form.src} style={imageStyle(link.text)} on:error={e => error('Image not found!')} />
{:else if form.mode === 'audio'}
	<audio controls src={form.src} style={getBaseStyle()} />
{:else if form.mode === 'video'}
	<!-- svelte-ignore a11y-media-has-caption -->
	<video controls src={form.src} style={getBaseStyle()} />
{:else if form.mode === 'website'}
	<div class="website-preview" class:description={form.description} style={websiteStyle(form)}>
		<div class="info">
			<h1>{form.title.trim()}</h1>
			{#if form.description}
				<p>
					{form.description}
				</p>
			{/if}
		</div>
		<div class="image" style={websiteImageStyle(form)}></div>
		{#if form.favicons.length}
			<div class="link">
				<!-- svelte-ignore a11y-missing-attribute -->
				<img src={form.favicons[0]} width="16px" height="16px" />
				<span>{form.url}</span>
			</div>
		{/if}
	</div>
{:else if form.mode === 'youtube'}
	<iframe style={getBaseStyle()} title={form.title} src={form.src} width="480" height="270" frameborder="0" allow="encrypted-media; picture-in-picture;" allowFullScreen></iframe>
{/if}

<svelte:options accessors={true}/>