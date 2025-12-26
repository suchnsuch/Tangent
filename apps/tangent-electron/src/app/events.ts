import type { HrefFormedLink } from 'common/indexing/indexTypes'
import type { TreeNode } from 'common/trees'
import type { TreeNodeOrReference } from 'common/nodeReferences'
import type { Tangent } from './model'
import type { AttributePredicate } from 'common/typewriterUtils'

export interface NavigationData {
	link?: HrefFormedLink
	target?: TreeNodeOrReference
	origin?: TreeNode | 'current'
	tangent?: Tangent
	direction?: 'in' | 'out' | 'replace'
}

interface PasteTextEventData {
	text: string
}

export class PasteTextEvent extends Event implements PasteTextEventData {
	text: string

	constructor(type: string, data: PasteTextEventData & EventInit) {
		super(type, data)
		this.text = data.text
	}
}

type SelectionRequestArgs = {
	inline?: AttributePredicate
	line?: AttributePredicate
	postProcessSelection?: (span: [number, number]) => [number, number]
}

export function markAsSelectionRequest(event: MouseEvent, args: SelectionRequestArgs) {
	(event as any).editorSelectionRequest = args
}

export function eventHasSelectionRequest(event: MouseEvent) {
	if ('editorSelectionRequest' in event) {
		return event.editorSelectionRequest as SelectionRequestArgs
	}
}
