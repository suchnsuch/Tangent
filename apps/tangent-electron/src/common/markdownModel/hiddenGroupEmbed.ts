import type { FormatType } from 'typewriter-editor/typesetting'
import { h, type VChild, type VNode } from 'typewriter-editor/rendering/vdom'
import type { AttributeMap } from '@typewriter/document'
import { getHiddenGroupAttributes } from './inline'

type HiddenGroupEmbedNode = VNode & { hiddenGroupOutput?: VChild }

// Defer output until after adjacent format nodes merge so decorations that
// split one inline group into several ops do not duplicate the rendered element.
export function hiddenGroupEmbedFormat<Data>(options: {
	name: string
	renderOutput: (data: Data, attributes: AttributeMap) => VChild
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

			const node = h('span', {
				className: containerClass + revealedClass,
				...getHiddenGroupAttributes(attributes)
			}, [
				h('span', { className: `${sourceClass} hidden${revealedClass}` }, children)
			]) as HiddenGroupEmbedNode
			node.hiddenGroupOutput = renderOutput(data, attributes)
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
