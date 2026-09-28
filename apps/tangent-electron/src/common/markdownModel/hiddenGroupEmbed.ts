import type { FormatType } from 'typewriter-editor/typesetting'
import { h, type VChild, type VNode } from 'typewriter-editor/rendering/vdom'
import type { AttributeMap } from '@typewriter/document'

type HiddenGroupEmbedNode = VNode & { hiddenGroupOutput?: VChild }

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
 * The output is appended after adjacent format nodes merge so decorations that
 * split one instance into several ops do not duplicate its rendered element.
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

			const node = h('span', { className: containerClass + revealedClass }, [
				h('span', { className: `${sourceClass} hidden${revealedClass}` }, children)
			]) as HiddenGroupEmbedNode
			node.hiddenGroupOutput = renderOutput(data, revealed, attributes)
			return node
		},
		postProcess: (node: HiddenGroupEmbedNode) => {
			if (node.hiddenGroupOutput !== undefined) {
				node.children.push(node.hiddenGroupOutput)
				delete node.hiddenGroupOutput
			}
			return node
		}
	}
}
