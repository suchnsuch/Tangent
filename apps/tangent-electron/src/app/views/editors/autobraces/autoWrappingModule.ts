import { rangeIsCollapsed } from 'common/typewriterUtils'
import { Editor, normalizeRange } from 'typewriter-editor'

type WrapMap = {
	[key: string]: {
		pair?: string,
		side?: 'left'|'right'|'both'
	}
}

const wrapMap: WrapMap = {
	'"' : {},
	"'" : {},
	'*' : {},
	'_' : {},
	'=' : {},
	'~' : {},
	'(' : {
		pair: ')',
		side: 'left'
	},
	')' : {
		pair: '(',
		side: 'right'
	},
	'[' : {
		pair: ']',
		side: 'left'
	},
	']' : {
		pair: '[',
		side: 'right'
	},
	'{' : {
		pair: '}',
		side: 'left'
	},
	'}' : {
		pair: '{',
		side: 'right'
	},
	'<' : {
		pair: '>',
		side: 'left'
	},
	'>' : {
		pair: '<',
		side: 'right'
	}
}

export default function autoWrapping(editor: Editor) {

	function onKeyDown(event: KeyboardEvent) {
		if (event.defaultPrevented) return
		if (event.metaKey || event.ctrlKey) return

		const doc = editor.doc;
		const selection = doc.selection

		if (!selection || rangeIsCollapsed(selection)) return

		const wrap = wrapMap[event.key]
		if (!wrap) return

		const [start, end] = normalizeRange(selection)

		const pair = wrap.pair ?? event.key

		const leftChar = wrap.side === 'left' ? event.key : pair
		const rightChar = wrap.side === 'right' ? event.key : pair

		console.log({ leftChar, rightChar })

		editor.change
			.insert(start, leftChar)
			.insert(end, rightChar)
			.select([start + 1, end + 1])
			.apply()

		event.preventDefault()
	}

	return {
		init() {
			editor.root.addEventListener('shortcut', onKeyDown)
		},
		destroy() {
			editor.root.removeEventListener('shortcut', onKeyDown)
		}
	}
}
