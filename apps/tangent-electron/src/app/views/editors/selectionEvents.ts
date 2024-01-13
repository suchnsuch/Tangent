import type { Editor, EditorRange } from 'typewriter-editor'

export interface SelectEventInit extends EventInit {
	selection?: EditorRange | number
}

export class SelectEvent extends Event implements SelectEventInit {

	selection?: EditorRange | number

	constructor(type: string, init?: SelectEventInit) {
		super(type, init)
		
		this.selection = init?.selection
	}
}

export function selectionModule(editor: Editor) {
	
	function onSetSelection(event: SelectEvent) {
		editor.select(event.selection)
	}

	return {
		init() {
			editor.root.addEventListener('setSelection', onSetSelection)
		},
		destroy() {
			editor.root.removeEventListener('setSelection', onSetSelection)
		}
	}
}
