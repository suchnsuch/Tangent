import type { getLinkPreview } from 'link-preview-js'

export type WebsiteData = {
	url: string
	title: string
	siteName: string
	description: string
	images: string[]
	mediaType: string
	contentType: string
	favicons: string[]
}

export type UrlDataError = {
	mediaType: 'error',
	message: string
}

export type UrlData = Awaited<ReturnType<typeof getLinkPreview>> | UrlDataError
