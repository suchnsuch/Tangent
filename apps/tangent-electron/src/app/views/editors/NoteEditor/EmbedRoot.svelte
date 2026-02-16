<script lang="ts">
import { EmbedType, getEmbedType } from 'common/embedding'
import type { HrefFormedLink } from 'common/indexing/indexTypes'
import type { Workspace } from 'app/model'
import type EmbedFile from 'app/model/EmbedFile'
import { type HandleResult, isNode } from 'app/model/NodeHandle'
import type { UrlDataError, WebsiteData } from 'common/urlData'
import PdfPreview from 'app/views/node-views/PdfPreview.svelte'
import { timeFromContentId } from 'app/model/nodeViewStates/AudioVideoViewState'
import { appendContextTemplate, type ContextMenuConstructorOptions } from 'app/model/menus'
import { linkTextFromLink } from 'common/markdownModel/links'

type Form = {
	mode: 'error'
	message: string
} | {
	mode: 'pending'
	src: string
} | {
	mode: 'image'
	src: string 
} | {
	mode: 'audio'
	src: string,
	time?: number
} | {
	mode: 'video'
	src: string,
	time?: number
} | {
	mode: 'pdf',
	src: string,
	content_id?: string
} | {
	mode: 'youtube'
	src: string
	title: string
} | {
	mode: 'website'
} & WebsiteData

export let link: HrefFormedLink
export let block: boolean
export let workspace: Workspace

export let onForm: (form: Form) => void
let form: Form = null
let mediaElement: HTMLVideoElement | HTMLAudioElement = null

let height = -1

$: nodeHandle = workspace?.getHandle(link)
$: onNodeHandleChanged(nodeHandle ? $nodeHandle : null)
function onNodeHandleChanged(value: HandleResult) {
	if (!value) {
		form = {
			mode: 'pending',
			src: link.href
		}
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
			case EmbedType.Audio:
				form = {
					mode: 'audio',
					src: (value as EmbedFile).cacheBustPath,
					time: timeFromContentId(link?.content_id) || 0
				}
				break
			case EmbedType.Video:
				form = {
					mode: 'video',
					src: (value as EmbedFile).cacheBustPath,
					time: timeFromContentId(link?.content_id) || 0
				}
				break
			case EmbedType.PDF:
				form = {
					mode: 'pdf',
					src: (value as EmbedFile).cacheBustPath
				}
				if (link?.content_id) form.content_id = link.content_id
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
			src: value.url,
			time: timeFromContentId(link.content_id) || 0
		}
	}
	else if (value.mediaType === 'video') {
		form = {
			mode: 'video',
			src: value.url,
			time: timeFromContentId(link.content_id) || 0
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
	else if (link.href.endsWith('.pdf')) {
		form = {
			mode: 'pdf',
			src: link.href
		}
		if (link.content_id) form.content_id = link.content_id
	}
	else {
		// Fall back to website info
		form = {
			mode: 'website',
			...value as WebsiteData
		}
	}

	onForm(form)
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
		style += 'margin: 0 auto;'
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

function audioStyle() {
	let style = getBaseStyle()
	if (block) {
		style +="width: 100%;"
	}
	return style
}

function websiteStyle(form: WebsiteData) {
	return getBaseStyle()
}

function websiteImageStyle(form: WebsiteData) {
	if (form.images?.length) {
		return `background: url("${form.images[0]}"); background-size: cover;`
	}
	return ''
}

function avloaded(this: HTMLAudioElement | HTMLVideoElement, event: Event) {
	if ((form.mode === 'audio' || form.mode === 'video') && form.time) {
		this.currentTime = form.time
	}
}

$: mediaHacks(mediaElement, form)
function mediaHacks(element: HTMLAudioElement | HTMLVideoElement, form: Form) {
	if (element && form && (form.mode === 'audio' || form.mode === 'video')) {
		element.currentTime = form.time
	}
}

function onMediaContext(event: MouseEvent) {
	if (!mediaElement) return

	const menu: ContextMenuConstructorOptions[] = []

	const currentTimeLinkText = linkTextFromLink({
		...link,
		content_id: `time=${mediaElement.currentTime}`
	})

	if (currentTimeLinkText) {
		menu.push({
			label: 'Copy link at current time',
			toolTip: 'Adds a link to this file at the current timestamp',
			click: () => {
				navigator.clipboard.writeText(currentTimeLinkText)
			}
		})
	}

	appendContextTemplate(event, menu)
}
</script>

{#if form.mode === 'error'}
	<span class="error">⚠</span>
{:else if form.mode === 'image'}
	<!-- svelte-ignore a11y-missing-attribute -->
	<img src={form.src} style={imageStyle(link.text)} on:error={e => error('Image not found!')} />
{:else if form.mode === 'audio'}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<media-controller style={audioStyle()} audio class="audio" on:click|preventDefault on:contextmenu={onMediaContext}>
		<audio bind:this={mediaElement} slot="media" src={form.src} currenttime={form.time} on:loadedmetadata={avloaded}></audio>
		<media-settings-menu hidden anchor="auto">
			<media-settings-menu-item>
				Speed
				<media-playback-rate-menu slot="submenu" hidden>
					<div slot="title">Speed</div>
				</media-playback-rate-menu>
			</media-settings-menu-item>
		</media-settings-menu>
		<media-control-bar>
			<div class="simple-menu">
				<media-play-button class="first" notooltip></media-play-button>
				<div class="floating">
					<media-seek-backward-button style="min-width: 3em"></media-seek-backward-button>
					<media-seek-forward-button style="min-width: 3em"></media-seek-forward-button>
				</div>
			</div>
			<div class="simple-menu">
				<media-mute-button notooltip></media-mute-button>
				<div class="floating">
					<media-volume-range></media-volume-range>
				</div>
			</div>
			<media-time-display showduration notoggle></media-time-display>
			<media-time-range></media-time-range>
			<media-settings-menu-button></media-settings-menu-button>
		</media-control-bar>
	</media-controller>
{:else if form.mode === 'video'}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<media-controller style={getBaseStyle()} on:click|preventDefault on:contextmenu={onMediaContext}>
		<!-- svelte-ignore a11y-media-has-caption -->
		<video bind:this={mediaElement} slot="media" src={form.src} currenttime={form.time} on:loadedmetadata={avloaded}></video>
		<media-settings-menu hidden anchor="auto">
			<media-settings-menu-item>
				Speed
				<media-playback-rate-menu slot="submenu" hidden>
					<div slot="title">Speed</div>
				</media-playback-rate-menu>
			</media-settings-menu-item>
		</media-settings-menu>
		<media-control-bar>
			<div class="simple-menu">
				<media-play-button class="first" notooltip></media-play-button>
				<div class="floating">
					<media-seek-backward-button style="min-width: 3em"></media-seek-backward-button>
					<media-seek-forward-button style="min-width: 3em"></media-seek-forward-button>
				</div>
			</div>
			<div class="simple-menu">
				<media-mute-button notooltip></media-mute-button>
				<div class="floating">
					<media-volume-range></media-volume-range>
				</div>
			</div>
			<media-time-display showduration notoggle></media-time-display>
			<media-time-range></media-time-range>
			<media-settings-menu-button></media-settings-menu-button>
			<media-fullscreen-button></media-fullscreen-button>
		</media-control-bar>
	</media-controller>
{:else if form.mode === 'pdf'}
	<div class="pdf" style:height={height > 0 ? height + 'px' : ''}>
		<PdfPreview path={form.src} content_id={form.content_id} bind:height />
	</div>
{:else if form.mode === 'website'}
	<div class={'website-preview ' + form.mediaType} class:description={form.description} style={websiteStyle(form)}>
		<div class="info">
			{#if form.title}
				<h1>{form.title.trim()}</h1>
			{/if}
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

<!--
	DO NOT USE STYLES! All styles are defined in t-embed.css.
	This avoids an issue where css is extracted during production and doesn't work in shadow dom.
-->
