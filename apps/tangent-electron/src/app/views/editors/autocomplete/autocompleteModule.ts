import { rangeContainsRange } from 'common/typewriterUtils'
import { WritableStore } from 'common/stores'
import { DecorateEvent, Decorator, Delta, Editor, EditorChangeEvent, EditorRange, normalizeRange, Op, proxy, Source, TextDocument } from "typewriter-editor"

interface AutocompleteEventData {
	handler?: AutocompleteHandler
	range?: EditorRange
}

export class AutocompleteEvent extends Event implements AutocompleteEventData {
	handler: AutocompleteHandler
	range: EditorRange

	constructor(type: string, data: AutocompleteEventData & EventInit) {
		super(type, data)
		this.handler = data.handler
		this.range = data.range
	}
}

export interface AutocompleteHandler {

	init(autocomplete: AutocompleteModule)

	// If activatable, return the range the handler will control
	canActivateFromTyping(char: string, doc: TextDocument): EditorRange | false

	// Called when the shortcut (e.g. ctrl+Space) is pressed
	canActivateByRequest(doc: TextDocument): EditorRange | false

	// Return true if the source text is still valid, false exits autocomplete
	updateSourceText(text: string, doc: TextDocument): boolean

	getCurrentOptionText()

	// Invoked by arrow key presses
	shiftSelection(shift: number)
	
	onKeyDown?(event: KeyboardEvent)

	// Called when the handler exits
	onEnd?()
}

export default function autocompleteWithHandlers(handlers: AutocompleteHandler[]) {
	return function(editor: Editor) {
		return new AutocompleteModule(editor, handlers)
	}
}

export function adjustRangeByChange(range: EditorRange, delta: Delta): EditorRange | false {
	const ops = delta.ops
	let index = 0

	let sizeChange = 0

	for (const op of ops) {
		if (op.retain) {
			index += op.retain
		}
		else if (op.delete) {
			if (index >= range[0] && index + op.delete <= range[1]) {
				sizeChange -= op.delete
			}
			else {
				return false
			}
		}
		else if (op.insert) {
			if (index >= range[0] && index <= range[1]) {
				sizeChange += Op.length(op)
			}
			else {
				return false
			}
		}
	}

	return [range[0], range[1] + sizeChange]
}

export class AutocompleteModule {
	editor: Editor
	handlers: AutocompleteHandler[]

	activeHandler: WritableStore<AutocompleteHandler>
	range: WritableStore<EditorRange>

	private nextRangeOverride: EditorRange

	// Function binds
	private _onChanging
	private _onShortcut
	private _onDecorate

	constructor(editor: Editor, handlers: AutocompleteHandler[]) {
		this.editor = editor
		this.handlers = handlers

		this.activeHandler = new WritableStore(null)
		this.range = new WritableStore(null)

		this._onChanging = this.onChanging.bind(this)
		this._onShortcut = this.onShortcut.bind(this)
		this._onDecorate = this.onDecorate.bind(this)

		for (const handler of handlers) {
			handler.init(this)
		}		
	}

	init() {

		this.editor.on('root', () => {
			this.range.subscribe(r => {
				this.onDecorate(null)
			})
		})

		this.editor.on('changing', this._onChanging)
		this.editor.on('decorate', this._onDecorate)
		this.editor.root.addEventListener('shortcut', this._onShortcut)
	}
	destroy() {
		this.editor.off('changing', this._onChanging)
		this.editor.off('decorate', this._onDecorate)
		this.editor.root.removeEventListener('shortcut', this._onShortcut)
	}

	activateAutocomplete(event?: Event) {
		for (const handler of this.handlers) {
			if (this.tryActivatingHandler(handler)) {
				event?.preventDefault()
				return
			}
		}
	}

	tryActivatingHandler(handler: AutocompleteHandler) {
		const result = handler.canActivateByRequest(this.editor.doc)
		if (result) {
			this.activateHandler(handler, result, this.editor.doc)
			return true
		}
		return false
	}

	activateHandler(handler: AutocompleteHandler, activationRange: EditorRange, doc: TextDocument) {
		if (this.activeHandler.value) {
			this.endAutocomplete()
		}

		this.activeHandler.value = handler
		this.range.value = activationRange

		this.activeHandler.value.updateSourceText(doc.getText(this.range.value), doc)

		this.editor.dispatchEvent(new AutocompleteEvent('autocomplete-start', {
			handler,
			range: this.range.value
		}))
	}

	updateAutocomplete(content: string, selection?: number | EditorRange) {
		const range = this.range.value
		let change = this.editor.change
			.delete(range)
			.insert(range[0], content)

		if (selection === undefined) {
			selection = range[0] + content.length
		}
		change.select(selection)

		change.apply()

		// Application _could_ cause the handler to reject the content
		if (range) {
			this.range.value = [range[0], range[0] + content.length]
		}
	}

	endAutocomplete() {
		this.editor.dispatchEvent(new AutocompleteEvent('autocomplete-end', {}))
		const handler = this.activeHandler.value
		if (handler?.onEnd) {
			handler.onEnd()
		}
		this.activeHandler.value = null
		this.range.value = null
	}

	setRangeForNextChange(range: EditorRange) {
		this.nextRangeOverride = range
	}

	private onChanging(event: EditorChangeEvent) {
		const doc = event.doc

		if (this.activeHandler.value) {
			if (event.change) {
				if (this.nextRangeOverride) {
					this.range.set(this.nextRangeOverride)
					this.nextRangeOverride = null

					if (!this.activeHandler.value.updateSourceText(doc.getText(this.range.value), doc)) {
						this.endAutocomplete()
					}

					return
				}

				const changeAdjustment = adjustRangeByChange(this.range.value, event.change.delta)
				if (changeAdjustment) {
					this.range.value = changeAdjustment

					if (!this.activeHandler.value.updateSourceText(doc.getText(this.range.value), doc)) {
						this.endAutocomplete()
						return
					}

					if (!rangeContainsRange(this.range.value, doc.selection)) {
						this.endAutocomplete()
						return
					}
				}
				else {
					this.endAutocomplete()
					return
				}
			}
		}
		else {
			if (event.source === Source.api || event.source === Source.history) return

			if (event.change && event.changedLines && event.changedLines.length) {
				const ops = event.change.delta.ops

				let insert: string = null
				if (ops.length === 1 && typeof ops[0].insert === 'string') {
					// The first character of a doc will not have a retain
					insert = ops[0].insert
				}
				else if (ops.length === 2 && ops[0].retain && typeof ops[1].insert === 'string') {
					insert = ops[1].insert
				}

				if (insert?.length === 1) {
					for (const handler of this.handlers) {
						const activation = handler.canActivateFromTyping(insert, doc) 
						if (activation) {
							this.activateHandler(handler, activation, doc)
							return
						}
					}
				}
			}
		}
	}

	private onShortcut(event: KeyboardEvent) {
		if (event.defaultPrevented) return

		const activeHandler = this.activeHandler.value
		if (activeHandler) {
			if (activeHandler.onKeyDown) {
				activeHandler.onKeyDown(event)
				if (event.defaultPrevented) return
			}

			if (!event.metaKey &&! event.altKey && !event.ctrlKey && !event.shiftKey) {
				switch (event.key) {
					case 'ArrowDown':
						activeHandler.shiftSelection(1)
						event.preventDefault()
					break
					case 'ArrowUp':
						activeHandler.shiftSelection(-1)
						event.preventDefault()
					break
					case 'Enter':
					case 'Tab':
						const result = activeHandler.getCurrentOptionText()
						if (result != null) {
							// Only update if an actual value is returned
							this.updateAutocomplete(result, this.range.value[0] + result.length)
						}
						this.endAutocomplete()
						event.preventDefault()
					break
					case 'Escape':
						this.endAutocomplete()
						event.preventDefault()
					break
				}
			}
		}
		else {
			// TODO: Make this configurable
			if (event.ctrlKey && event.key === ' ') {
				this.activateAutocomplete(event)
			}
		}
	}

	private onDecorate(event: DecorateEvent) {
		const decorator = this.editor.modules.decorations.getDecorator('autocomplete-range') as Decorator
		if (decorator.hasDecorations() || this.range.value)
		{
			decorator.clear()
			if (this.range.value) {
				decorator.decorateText(this.range.value, { class: 'autocompleting' })
			}
			decorator.apply()
		}
	}
}
