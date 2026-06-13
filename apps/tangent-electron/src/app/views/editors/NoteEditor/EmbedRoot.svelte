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
import { getMediaCustomizationsFromText, linkTextFromLink } from 'common/markdownModel/links'
import { deepEqual } from 'fast-equals'

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

let {
	link, block, workspace,
	onForm
} : {
	link: HrefFormedLink
	block: boolean
	workspace: Workspace

	onForm: (form: Form) => void
} = $props()

export function getBlock() { return block }
export function setBlock(isBlock: boolean) { block = isBlock }
export function getLink() { return link }
export function setLink(newLink: HrefFormedLink) { link = newLink }

let mediaElement: HTMLVideoElement | HTMLAudioElement = $state(null)

let height = $state(-1)

let nodeHandle = $derived(workspace?.getHandle(link))
let form: Form = $derived(handleToForm(nodeHandle ? $nodeHandle : null))
let formCache: Form = undefined

$effect(() => {
	if (!deepEqual(form, formCache)) {
		formCache = form
		onForm(form)
	}
})

function handleToForm(value: HandleResult): Form {
	if (!value) {
		return {
			mode: 'pending',
			src: link.href
		}
	}

	if (typeof value === 'string') {
		// This occurs with a bad md link
		// Assume this is an image embed from outside the directory
		return {
			mode: 'image',
			src: link.href
		}
	}

	if (Array.isArray(value)) {
		if (value.length > 0) {
			return errorForm('Could not resolve the link to a single file. Be more specific.')
		}
		return errorForm('Could not resolve the link. Is it correct?')
	}

	if (isNode(value)) {
		if (value.meta?.virtual) {
			return errorForm('Cannot embed a virtual file: it doesn\'t exist!')
		}

		switch (getEmbedType(value)) {
		case EmbedType.Image:
			return {
				mode: 'image',
				src: (value as EmbedFile).cacheBustPath
			}
		case EmbedType.Audio:
			return {
				mode: 'audio',
				src: (value as EmbedFile).cacheBustPath,
				time: timeFromContentId(link?.content_id) || 0
			}
		case EmbedType.Video:
			return {
				mode: 'video',
				src: (value as EmbedFile).cacheBustPath,
				time: timeFromContentId(link?.content_id) || 0
			}
		case EmbedType.PDF:
			let form: Form = {
				mode: 'pdf',
				src: (value as EmbedFile).cacheBustPath
			}
			if (link?.content_id) form.content_id = link.content_id
			return form
		default:
			return errorForm(`Invalid file type. Cannot embed a "${value.fileType}" file.`)
		}
	}

	if (value.mediaType === 'image') {
		return {
			mode: 'image',
			src: value.url
		}
	}

	if (value.mediaType === 'audio') {
		return {
			mode: 'audio',
			src: value.url,
			time: timeFromContentId(link.content_id) || 0
		}
	}

	if (value.mediaType === 'video') {
		return {
			mode: 'video',
			src: value.url,
			time: timeFromContentId(link.content_id) || 0
		}
	}

	if (value.mediaType === 'website') {
		return {
			mode: 'website',
			...value as WebsiteData
		}
	}

	if (value.mediaType === 'video.other' && 'siteName' in value && value.siteName === 'YouTube') {
		// Explicitly handle youtube embedding
		const youtubePrefix = 'https://www.youtube.com/watch?v='
		const index = value.url.indexOf(youtubePrefix)
		if (index !== -1) {
			let watchCode = value.url.substring(index + youtubePrefix.length)
			const ampIndex = watchCode.indexOf('&')
			if (ampIndex !== -1) {
				watchCode = watchCode.substring(0, ampIndex)
			}

			return {
				mode: 'youtube',
				src: 'https://www.youtube.com/embed/' + watchCode,
				title: value.title
			}
		}
		return errorForm('Bad youtube link!')
	}

	if (value.mediaType === 'error') {
		return errorForm((value as UrlDataError).message)
	}

	if (link.href.endsWith('.pdf')) {
		let form: Form = {
			mode: 'pdf',
			src: link.href
		}
		if (link.content_id) form.content_id = link.content_id
		return form
	}
	
	// Fall back to website info
	return {
		mode: 'website',
		...value as WebsiteData
	}
}

function error(message: string) {
	form = errorForm(message)
}

function errorForm(message: string): Form {
	return {
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

let containerStyle = $derived.by(() => {
	let style = 'max-width: 100%;'

	let setWidth = false
	const customizations = getMediaCustomizationsFromText(link.text)
	if (customizations?.width >= 10) {
		style += `width: ${customizations.width}px;`
		setWidth = true
	}
	else if (form.mode === 'audio' || form.mode === 'video') {
		style += `width: 100%;`
		setWidth = true
	}

	if (height > 0) {
		style += `height: ${height}px;`
	}
	else if (customizations?.height >= 10) {
		style += `height: ${customizations.height}px;`
	}

	if (customizations?.float && !setWidth && (form.mode === 'pdf' || form.mode === 'website')) {
		style += 'width: 18em;' // I'd like this to be percentage-based, but that wasn't working…
	}

	if (block || !customizations?.float) {
		style += 'margin: 0 auto;'
	}
	return style
})

function websiteImageStyle(form: WebsiteData) {
	if (form.images?.length) {
		return `background: url("${form.images[0]}"); background-size: cover;`
	}
	return ''
}

function onAvLoaded(this: HTMLAudioElement | HTMLVideoElement, event: Event) {
	if ((form.mode === 'audio' || form.mode === 'video') && form.time) {
		this.currentTime = form.time
	}
}

$effect(() => {
	if (mediaElement && form && (form.mode === 'audio' || form.mode === 'video')) {
		mediaElement.currentTime = form.time
	}
})

function onMediaContext(event: MouseEvent) {
	if (!mediaElement) return

	const menu: ContextMenuConstructorOptions[] = []

	const currentTimeLinkText = linkTextFromLink({
		...link,
		content_id: `time=${mediaElement.currentTime}`
	})

	if (currentTimeLinkText) {
		menu.push({
			label: 'Copy Link at Current Time',
			toolTip: 'Adds a link to this file at the current timestamp',
			click: () => {
				navigator.clipboard.writeText('!' + currentTimeLinkText)
			}
		})
	}

	appendContextTemplate(event, menu)
}
</script>

{#if form.mode === 'error'}
	<span class="error">⚠</span>
{:else if form.mode === 'image'}
	<!-- svelte-ignore a11y_missing_attribute -->
	<img src={form.src} style={containerStyle} onerror={e => error('Image not found!')} />
{:else if form.mode === 'audio'}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<media-controller style={containerStyle} audio class="audio" onclick={e => e.preventDefault()} oncontextmenu={onMediaContext}>
		<audio bind:this={mediaElement} slot="media" src={form.src} currenttime={form.time} onloadedmetadata={onAvLoaded}></audio>
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
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<media-controller style={containerStyle} onclick={e => e.preventDefault()} oncontextmenu={onMediaContext}>
		<!-- svelte-ignore a11y_media_has_caption -->
		<video bind:this={mediaElement} slot="media" src={form.src} currenttime={form.time} onloadedmetadata={onAvLoaded}></video>
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
	<div class="pdf" style={containerStyle}>
		<PdfPreview path={form.src} content_id={form.content_id} bind:height />
	</div>
{:else if form.mode === 'website'}
	<div class={'website-preview ' + form.mediaType} class:description={form.description} style={containerStyle}>
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
				<!-- svelte-ignore a11y_missing_attribute -->
				<img src={form.favicons[0]} width="16px" height="16px" />
				<span>{form.url}</span>
			</div>
		{/if}
	</div>
{:else if form.mode === 'youtube'}
	{@const customizations = getMediaCustomizationsFromText(link.text)}
	{@const width = customizations?.width ?? 480}
	{@const height = customizations?.height ?? width / (16/9)}
	<iframe style={getBaseStyle()} title={form.title} src={form.src} width={width} height={height} frameborder="0" allow="encrypted-media; picture-in-picture;" allowFullScreen></iframe>
{/if}

<!--
	DO NOT USE STYLES! All styles are defined in t-embed.css.
	This avoids an issue where css is extracted during production and doesn't work in shadow dom.
-->
