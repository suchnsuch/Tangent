import type { FormatType } from 'typewriter-editor/typesetting'
import { h, type VChild } from 'typewriter-editor/rendering/vdom'
import type { AttributeMap } from '@typewriter/document'

/**
 * Shared shape for inline formats that keep the raw Markdown source around as a
 * hidden, cursor-navigable span alongside an always-rendered output element
 * (e.g. inline math's `<t-math>`, furigana's `<ruby>`). Reveal state only
 * ever toggles the source span's classes; the output renders the same
 * either way.
 *
 * `name` doubles as the attribute key holding the format's data
 * (`attributes[name]`) and as the stem of its selector and class names.
 *
 */
export function hiddenGroupEmbedFormat<Data>(options: {
	name: string
	renderOutput: (data: Data, revealed: boolean, attributes: AttributeMap) => VChild
}): FormatType {
	const { name, renderOutput } = options

	const sourceClass = `${name}-source`
	const containerClass = `inline-${name}-container`

	return {
		name,
		selector: `span.${sourceClass}`,
		render: (attributes: AttributeMap, children) => {
			const data = attributes[name] as Data
			const revealed = !!attributes.revealed
			const revealedClass = revealed ? ' revealed' : ''

			return h('span', { className: containerClass + revealedClass }, [
				h('span', { className: `${sourceClass} hidden${revealedClass}` }, children),
				renderOutput(data, revealed, attributes)
			])
		}
	}
}
