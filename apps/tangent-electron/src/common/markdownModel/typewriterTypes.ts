import type { FormatType, LineType, TypesetTypes } from 'typewriter-editor/lib/typesetting'
import { h } from 'typewriter-editor/lib/rendering/vdom'
import katex from 'katex'
import type { IndentDefinition } from './line'
import type { AttributeMap } from '@typewriter/document'
import { isMac } from '../isMac'
import type { ListDefinition } from './list'
import type { TagSectionData } from './tag'

const defaultOptions = {}

const clickMessage = (isMac ? '⌘+Click' : 'Ctrl+Click') + ' or middle-click to open in a new pane.'

function getHideableFormatClass(attributes, baseClass = '') {
	let className = baseClass

	if (attributes.hidden) {
		className += ' hidden'
	}
	if (attributes.start) {
		className += ' start'
	}
	if (attributes.end) {
		className += ' end'
	}
	if (attributes.revealed) {
		className += ' revealed'
	}
	
	return className
}

function hideableFormat(
	formatName: string,
	options?: {
		elementName?: string,
		attributeClasses?: string[],
		attributes?: any
	}): FormatType
{
	options = options || defaultOptions
	const elementName = options.elementName || 'span'

	return {
		name: formatName,
		selector: `${elementName}.${formatName}`,
		render: (attributes, children) => {
			
			let className = getHideableFormatClass(attributes, formatName)

			let formatAttribute = attributes[formatName]
			if (typeof formatAttribute === 'string') {
				className += ' ' + formatAttribute
			}

			if (options.attributeClasses) {
				for (const attr of options.attributeClasses) {
					if (attributes[attr]) {
						className += ' ' + attr
					}
				}
			}

			let elementAttributes: AttributeMap = {
				class: className,
				...options?.attributes
			}

			if (attributes.spellcheck != undefined) {
				elementAttributes.spellcheck = attributes.spellcheck
			}

			return h(elementName, elementAttributes, children)
		}
	}
}

function revealableLine(lineName: string, elementName: string = 'div'): LineType {
	return {
		name: lineName,
		selector: `${elementName}.${lineName}`,
		defaultFollows: true,
		render: (attributes, children) => {
			return h(
				elementName,
				getCoreLineProperties(attributes, lineName),
				children)
		}
	}
}

function getCoreLineProperties(attributes, baseClass = ''): AttributeMap {
	let className = baseClass + ' line'
	if (attributes.revealed) {
		className += ' revealed'
	}
	if (attributes.empty) {
		className += ' empty'
	}
	const indent = attributes.indent as IndentDefinition
	let style = ''
	if (indent) {
		style += `--lineIndent: ${indent.indentSize};`
	}

	// Since this touches the class, need to reimplement decoration classes
	const decoration = attributes.decoration
	if (decoration) {
		for (const key of Object.keys(decoration)) {
			if (decoration[key]?.class) {
				className += ' ' + decoration[key].class
			}
		}
	}
	
	return {
		className,
		style,
		dir: 'auto' // for RTL language support
	}
}

function codeFormatAltClass(type: string) {
	switch (type) {
		case 'key':
			return 'keyword'
	}
}

const noteTypeset:TypesetTypes = {
	lines: [
		{
			name: 'line',
			selector: 'p',
			render: (attributes, children) => {
				return h('p', getCoreLineProperties(attributes), children)	
			}
		},
		{
			name: 'header',
			selector: 'h1, h2, h3, h4, h5, h6',
			defaultFollows: true,
			render: (attributes, children) => h(`h${attributes.header}`, getCoreLineProperties(attributes), children)
		},
		{
			name: 'list',
			selector: 'p.list',
			defaultFollows: true,
			render: (attributes, children) => {
				const listData = attributes.list as ListDefinition
				let props = getCoreLineProperties(attributes, 'list') as any
				props.listForm = listData.form
				props.listGlyph = listData.glyph

				if (listData.checked) {
					props.className += ' checked'
				}

				return h('p', props, children)
			}
		},
		{
			name: 'blockquote',
			selector: 'blockquote p',
			defaultFollows: false,
			fromDom(node: HTMLElement) {
				const { className } = node.parentElement
				const match = className.match(/depth-(\d+)/)
				const blockquote = parseInt(match && match[1])
				return { blockquote }
			},
			shouldCombine: (prev, next) => {
				return prev.blockquote === next.blockquote
			},
			renderMultiple: lineData => {
				let depth = lineData[0][0].blockquote

				const children = lineData.map(([attributes, children, id]) => {

					let props = getCoreLineProperties(attributes, 'blockquote')
					props.key = id

					return h('p', props, children)
				})
				return h('blockquote', { className: `depth-${depth}` }, children)
			}
		},
		{
			name: 'code',
			selector: 'pre code div.codeLine',
			defaultFollows: true,
			fromDom(node: HTMLElement) {
				const { className } = node.parentElement
				const match = className.match(/language-(.*)/)
				const result:any = {}
				if (match && match[1] !== 'none') {
					result.code = match[1]
				}
				return result
			},
			shouldCombine: (prev, next) => {
				return prev.code === next.code
			},
			renderMultiple: lineData => {
				const children = lineData.map(([attributes, children, id]) => {
					let props = getCoreLineProperties(attributes, 'codeLine')
					props.key = id
					
					return h('div', props, children)
				})
				const codeFormat = lineData[0][0].code
				const className = typeof codeFormat === 'string' ? `language-${codeFormat}` : 'language-none'
				return h('pre', { className, spellcheck: false }, h('code', { className }, children))
			}
		},
		{
			name: 'front_matter',
			selector: 'div.frontMatter code div.frontMatterLine',
			defaultFollows: true,
			shouldCombine: (prev, next) => {
				return prev.front_matter === next.front_matter
			},
			renderMultiple: lineData => {
				const children = lineData.map(([attributes, children, id]) => {
					let props = getCoreLineProperties(attributes, 'frontMatterLine')
					props.key = id
					return h('div', props, children)
				})
				return h('div', { className: 'frontMatter', spellcheck: false }, h('code', null, children))
			}
		},
		{
			name: 'math',
			selector: 'figure pre code div.mathLine',
			defaultFollows: true,
			shouldCombine: (prev, next) => {
				return prev.math.source === next.math.source
			},
			renderMultiple: lineData => {
				let math: any = null
				let revealed = false
				const codeChildren = lineData.map(([attributes, children, id]) => {
					if (!math) math = attributes.math
					if (attributes.revealed) revealed = true
					let props = getCoreLineProperties(attributes, 'mathLine')
					props.key = id

					return h('div', props, children)
				})
				let className = 'language-latext hidden'
				if (revealed) className += ' revealed'
				return h('figure', { }, [
					h('pre', { className, spellcheck: false }, h('code', { className }, codeChildren)),
					h('t-math', { 'math-source': math.source, 'block': '' })
				])
			}
		},
		revealableLine('horizontal_rule', 'p')
	],
	formats: [
		// Formatting that starts a line
		{
			name: 'line_format',
			selector: 'span.line_format',
			render: (attributes, children) => {
				let props = {
					className: getHideableFormatClass(attributes, 'line_format ' + attributes.line_format)
				} as any

				// This needs to work with all line prefixing

				if (attributes.list_format) {
					const listData = attributes.list_format as ListDefinition
					props.listGlyph = listData.glyph
					if (listData.checked != null) {
						props.className += ' checkbox'
					}
				}

				return h('span', props, children)
			}
		},

		{
			name: 'line_comment',
			selector: 'span.line_comment',
			render: (attributes, children) => {
				let className = 'comment line_comment'
				if (attributes.line_comment === 'start') {
					className += ' start hidden'
					if (attributes.revealed) {
						className += ' revealed'
					}
				}
				return h('span', { className }, children)
			}
		},

		{
			name: 'highlight',
			selector: 'mark',
			render: (attributes, children) => {
				let className = getHideableFormatClass(attributes)
				if (typeof attributes.highlight === 'string') {
					className += ' ' + attributes.highlight
				}
				return h('mark', { className }, children)
			}
		},

		hideableFormat('inline_code',
			{
				elementName: 'code',
				attributeClasses: ['afterSpace', 'beforeSpace'],
				attributes: {
					spellcheck: false
				}
			}),

		hideableFormat('italic', { elementName: 'em' } ),
		hideableFormat('bold', { elementName: 'strong' }),
		hideableFormat('strikethrough', { elementName: 's' }),

		{
			name: 'list_format',
			selector: 'span.list_format',
			render: (attributes, children) => {
				let className = 'list_format'

				const listData = attributes.list_format as ListDefinition

				if (attributes.revealed) {
					className += ' revealed'
				}

				if (listData.checked != undefined) {
					className += ' checkbox'
					if (!attributes.revealed) {
						children = [
							h('span', { className: 'text' }, children),
							h('t-checkbox', {
								checked: listData.glyph.includes('x')
							})
						]
					}
				}
				else {
					children = h('span', { className: 'text' }, children)
				}

				return h('span', {
					className,
					listGlyph: listData.glyph
				}, children)
			}	
		},

		{
			name: 't_link',
			selector: 't-link',
			render: (attributes, children) => {
				let className = ''
				if (attributes.revealed) {
					className += ' revealed'
				}
				return h(
					't-link',
					{
						class: className,
						title: clickMessage,
						...attributes.t_link
					},
					children)
			}
		},

		{
			name: 't_embed',
			selector: '.t-embed',
			render: (attributes, children) => {
				let className = 't-embed'
				if (attributes.revealed) {
					className += ' revealed'
				}

				let node = h(
					'span',
					{
						class: className,
					},
					[
						// The text itself is a normal link
						h('t-link', { ...attributes.t_embed }, children)
					])
				
				node.t_embed_props = attributes.t_embed

				return node
			},
			postProcess: (node) => {
				node.children.push(h(
					't-embed',
					{
						title: clickMessage,
						...(node as any).t_embed_props
					}))
				return node;
			}
		},

		{
			name: 'code_syntax',
			selector: 'span.code_syntax',
			render: (attributes, children) => {
				let className = 'code_syntax token'
				if (typeof attributes.code_syntax === 'string') {
					className += ' '
					className += attributes.code_syntax

					const alts = codeFormatAltClass(attributes.code_syntax)
					if (alts) {
						className += ' '
						className += alts
					}
				}

				return h('span', { className }, children)
			}
		},

		{
			name: 'tag',
			selector: 'span.tag',
			render: (attributes, children) => {
				const tag = attributes.tag as string[]
				let className = 'tag TAG-' + tag.join('--')
				if (attributes.revealed) {
					className += ' revealed'
				}
				const props = {
					className,
					spellcheck: false
				}
				return h('span', props, children)
			}
		},
		{
			name: 'tag_section',
			selector: 'span.tag_section',
			render: (attributes, children) => {
				const section = attributes.tag_section as TagSectionData
				let className = 'tagSection TAG-' + section.name + ' tagSectionDepth-' + section.depth
				if (section.depth === section.totalDepth) {
					className += ' last'
				}
				if (attributes.revealed) {
					className += ' revealed'
				}
				const props = {
					className
				}
				return h('span', props, children)
			}
		},
		{
			name: 'tag_seperator',
			selector: 'span.tagSeperator',
			render: (attributes, children) => {
				const seperator = attributes.tag_seperator
				let className = 'tagSeperator' + ' tagSeperatorDepth-' + seperator.depth
				className += ' tagSeperator--' + seperator.prev + '--' + seperator.next
				if (attributes.revealed) {
					className += ' revealed'
				}
				const props = {
					className
				}
				return h('span', props, children)
			}
		},

		{
			name: 'math',
			selector: 'span.math',
			render: (attributes, children) => {
				let className = 'math hidden'
				if (attributes.revealed) {
					className += ' revealed'
				}

				let mathAttr = {
					'math-source': attributes.math.source,
				} as any

				if (attributes.math.isBlock) {
					mathAttr.block = ''
				}

				return h('span', {}, [
					h('span', { className }, children),
					h('t-math', mathAttr, [])
				])
			}
		},

		hideableFormat('link_internal'),
		hideableFormat('tag_internal')
	]
}

// Initialize with the attributes not directly attached to types
let formatClearSet = {
	hidden: null,
	hiddenGroup: null,
	revealed: null,
	end: null,
	start: null,
	beforeSpace: null,
	afterSpace: null
}
for (const format of noteTypeset.formats) {
	if (typeof format === 'string') {
		formatClearSet[format] = null
	}
	else {
		formatClearSet[format.name] = null
	}
}

export const negativeInlineFormats = formatClearSet

export default noteTypeset
