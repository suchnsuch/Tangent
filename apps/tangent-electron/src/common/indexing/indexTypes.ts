import paths from 'common/paths'
import type { TreeNode } from 'common/trees'

export interface IndexData {
	modified?: Date

	virtual?: boolean
	
	inLinks?: ConnectionInfo[]

	// Holding these in a list instead of an object
	// for ease of arbitrary note-level finding
	structure?: StructureData[]
}

export namespace IndexData {
	export function* outgoingConnections(data: IndexData, filter?: (item: ConnectionInfo) => boolean) {
		if (!data?.structure) return

		for (const item of data.structure) {
			if ((item.type === StructureType.Link || item.type === StructureType.Embed || item.type === StructureType.Tag) && (!filter || filter(item))) {
				yield item
			}
		}
	}

	export function findOutgoingConnection(data: IndexData, find: (item: ConnectionInfo) => boolean) {
		if (!data.structure) return

		for (const item of data.structure) {
			if ((item.type === StructureType.Link || item.type === StructureType.Embed || item.type === StructureType.Tag) && find(item)) {
				return item
			}
		}

		return null
	}

	export function* headers(data: IndexData, filter?: (item: HeaderInfo) => boolean) {
		if (!data?.structure) return

		for (const item of data.structure) {
			if (item.type === StructureType.Header && (!filter || filter(item))) {
				yield item
			}
		}
	}

	export function* tags(data: IndexData, filter?: (item: TagInfo) => boolean) {
		if (!data?.structure) return

		for (const item of data.structure) {
			if (item.type === StructureType.Tag && (!filter || filter(item))) {
				yield item
			}
		}
	}

	export function* todos(data: IndexData, filter?: (item: TodoInfo) => boolean) {
		if (!data?.structure) return

		for (const item of data.structure) {
			if (item.type === StructureType.Todo && (!filter || filter(item))) {
				yield item
			}
		}
	}

	export function findFrontMatter(node: TreeNode) {
		if (node.meta?.structure?.length > 0) {
			const first = node.meta.structure[0]
			if (first.type === StructureType.FrontMatter) {
				return first as FrontMatter
			}
		}
		return null
	}

	export function withFrontMatter(node: TreeNode, func: (fm: FrontMatter) => void) {
		const frontMatter = findFrontMatter(node)
		if (frontMatter) func(frontMatter)
	}

	export function findAliasPaths(node: TreeNode) : null | string[] {
		const frontMatter = findFrontMatter(node)
		if (frontMatter && Array.isArray(frontMatter.data?.aliases)) {
			const result: string[] = []
			const base = paths.dirname(node.path)
			for (const alias of frontMatter.data.aliases) {
				if (typeof alias !== 'string') continue
				result.push(paths.join(base, alias))
			}
			return result
		}
		return null
	}
}

export interface IndexDataUpdate {
	path: string
	meta: IndexData,
	form?: 'set' | 'patch'
}

export enum StructureType {
	Link,
	Embed,
	Header,
	FrontMatter,
	Todo,
	Tag
}

// The common `type` value allows for easy switching into the type data
export type StructureData = LinkInfo | HeaderInfo | EmbedInfo | FrontMatter | TodoInfo | TagInfo

export type ConnectionInfo = LinkInfo | EmbedInfo | TagInfo

interface UntypedLinkInfo {
	// The text range of the incoming link
	start: number
	end: number
	
	// The filepath information. "abc" of [[abc|text]]
	href: string
	
	// The textual override, if any. "text" of [[abc|text]]
	text?: string
	
	// The header/block link. "header" of [[abc#header]]; "^foo" of [[abc#^foo]]
	content_id?: string
	
	// The full path of the file the link originates from
	from?: string
	
	// The full path of the target file
	to?: string,
	
	// The full line context of the link
	context?: string
}

export type LinkInfo = UntypedLinkInfo & {
	type: StructureType.Link
	form: HrefForm
}

export type EmbedInfo = UntypedLinkInfo & {
	type: StructureType.Embed
	form: HrefForm
}

export type TagInfo = UntypedLinkInfo & {
	type: StructureType.Tag
	form: 'tag' | 'front-matter'
}

export type PartialLink = Partial<UntypedLinkInfo> & { type?: StructureType.Link | StructureType.Embed | StructureType.Tag }
export type HrefLink = Pick<UntypedLinkInfo, 'href'> & PartialLink
export type HrefForm = 'md' | 'wiki' | 'raw' | 'tag' | 'front-matter'
export type HrefFormedLink = HrefLink & { form: HrefForm }

export interface HeaderInfo {
	type: StructureType.Header
	
	start: number
	end: number

	level: number
	// The full text — e.g. `## Header Text` — of the header
	text: string
}

export interface FrontMatter {
	type: StructureType.FrontMatter
	start: number
	end: number
	data: { [key: string]: any }
}

export type TodoState = 'open' | 'checked' | 'canceled'
export interface TodoInfo {
	type: StructureType.Todo

	// The entire line
	start: number
	end: number

	state: TodoState
	// The text after the checkbox
	text: string
}
