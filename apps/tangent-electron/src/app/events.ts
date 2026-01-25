import type { HrefFormedLink } from 'common/indexing/indexTypes'
import type { TreeNode } from 'common/trees'
import type { TreeNodeOrReference } from 'common/nodeReferences'
import type { Tangent, Workspace } from './model'
import type { AttributePredicate } from 'common/typewriterUtils'

export interface NavigationData {
	link?: HrefFormedLink
	target?: TreeNodeOrReference
	origin?: TreeNode | 'current'
	tangent?: Tangent
	direction?: 'in' | 'out' | 'replace'
}

export type NavigationCallback = (data: NavigationData) => void
export type ViewReadyCallback = () => void
export type KeyboardExitCallback = (event: KeyboardEvent) => void

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

export function getLinkDirectionFromEvent(event: KeyboardEvent | MouseEvent, workspace: Workspace): NavigationData['direction'] {
	const { shiftKey, altKey } = event

	if (altKey) {
		return 'in'
	}
	else if (shiftKey !== (workspace.settings.linkClickPaneBehavior.value === 'replace')) {
		return 'replace'
	}

	return 'out'
}

