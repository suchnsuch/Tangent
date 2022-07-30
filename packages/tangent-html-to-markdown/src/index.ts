import { repeatString } from '@such-n-such/core'
import { anyChild } from '@such-n-such/core-browser'
import TurndownService from 'turndown'

const headernames = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6']
const blocknames = ['P', 'UL', 'OL', ...headernames]

function getBlockContainers(node: HTMLElement, options) {
	let prefix = '\n\n'
	let suffix = '\n\n'

	if (options.googleDoc) {
		if (node.style.marginTop === '0pt') {
			prefix = '\n'
		}
		if (node.style.marginBottom === '0pt') {
			suffix = '\n'
		}
	}

	return { prefix, suffix }
}

function cleanPlaceholders(text: string) {
	return text.replace(/<br>/g, '')
}

let turndown = null
function getTurndown() {
	if (turndown === null) {
		turndown = new TurndownService({
			headingStyle: 'atx',
			hr: '---',
			codeBlockStyle: 'fenced'
		})

		// Copy/pasted so that headers don't have trailing blank lines
		turndown.addRule('paragraph', {
			filter: 'p',

			replacement (content, node: HTMLElement, options) {
				if (cleanPlaceholders(content).trim() === '') return ''

				let { prefix, suffix } = getBlockContainers(node, options)

				if (node.previousSibling?.nodeName.match(/h\d+/i)) {
					// Following a header
					prefix = '\n'
				}

				return prefix + content + suffix
			}
		})
		turndown.addRule('heading', {
			filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],

			replacement: function (content, node: Node, options) {
				var hLevel = Number(node.nodeName.charAt(1))

				if (options.headingStyle === 'setext' && hLevel < 3) {
					var underline = repeatString((hLevel === 1 ? '=' : '-'), content.length)
					return (
						'\n\n' + content + '\n' + underline + '\n'
					)
				} else {
					return '\n\n' + repeatString('#', hLevel) + ' ' + content + '\n'
				}
			}
		})

		turndown.addRule('list', {
			filter: ['ul', 'ol'],

			replacement: function (content, node: HTMLElement, options) {
				var parent = node.parentNode
				let { prefix, suffix } = getBlockContainers(node, options)

				if (parent.nodeName === 'LI' && parent.lastElementChild === node) {
					prefix = '\n'
					suffix = ''
				}
				else {
					prefix = '\n'
					suffix = '\n'
				}

				return prefix + content + suffix
			}
		})

		// Copy/pasted this to reduce the number of trailing spaces
		turndown.addRule('list-item', {
			filter: 'li',
	
			replacement: function (content, node: Node, options) {
				var prefix = options.bulletListMarker + ' '
				var parent = node.parentNode

				content = content
					.replace(/^\n+/, '') // remove leading newlines
					.replace(/\n+$/, '') // replace trailing newlines with just a single one
					.replace(/\n/gm, '\n\t') // indent

				if (parent.nodeName === 'OL') {
					var start = (parent as HTMLElement).getAttribute('start')
					var index = Array.prototype.indexOf.call(parent.children, node)
					prefix = (start ? Number(start) + index : index + 1) + '. '
				}
				return (
					prefix + content + (node.nextSibling && !/\n$/.test(content) ? '\n' : '')
				)
			}
		})

		// Customized to remove bold/italic wrappers around an entire document (thanks google docs, very cool)
		turndown.addRule('emphasis', {
			filter: ['em', 'i'],

			replacement: function (content, node, options) {
				if (!content.trim()) return ''
				if (anyChild(node.childNodes, n => blocknames.includes(n.nodeName))) {
					// An italic wrapper around block level elements makes no sense
					return content
				}
				return options.emDelimiter + content + options.emDelimiter
			}
		})
		turndown.addRule('strong', {
			filter: ['strong', 'b'],

			replacement: function (content, node: Node, options) {
				if (!content.trim()) return ''
				if (anyChild(node.childNodes, n => blocknames.includes(n.nodeName))) {
					// A bold wrapper around block level elements makes no sense
					return content
				}
				return options.strongDelimiter + content + options.strongDelimiter
			}
		})

		turndown.addRule('span', {
			filter: 'span',

			replacement: function (content: string, node: HTMLElement, options) {
				let prefix = ''
				let suffix = ''

				const weightString = node.style.fontWeight
				if (weightString) {
					const weight = parseInt(weightString)
					// Don't mark bold in headers, redundant
					if (weight > 400 && !headernames.includes(node.parentElement?.nodeName)) {
						prefix += options.strongDelimiter
						suffix += options.strongDelimiter
					}	
				}

				if (node.style.fontStyle === 'italic') {
					prefix += options.emDelimiter
					suffix = options.emDelimiter + suffix
				}
				
				return prefix + content + suffix
			}
		})

		turndown.addRule('lineBreak', {
			filter: 'br',

			replacement: function (content, node: Node, options) {
				// no need to process breaks between block nodes
				if (!options.googleDoc &&
					(blocknames.includes(node.previousSibling?.nodeName)
					|| blocknames.includes(node.nextSibling?.nodeName))) {
					return ''
				}
				// This tag is cleaned up later and ensures the line is not collapsed
				return '<br>\n'
			}
		})

		// Avoid tags we don't want to see
		turndown.addRule('null', {
			filter: ['head', 'style'],
			replacement: function (content, node, options) {
				return ''
			}
		})
	}
	return turndown
}

export default function htmlToMarkdown(html: string): string {
	// TODO: remove hard browser dependency with domino/jsdom/etc
	if (html.startsWith('<!DOCTYPE html')) {
		// When pasting a full document, we only care about the body.
		let frag = document.createElement('html')
		frag.innerHTML = html
		html = frag.getElementsByTagName('body')[0]?.innerHTML ?? html
	}

	const td = getTurndown()
	td.options.googleDoc = html.startsWith('<b id="docs-internal')

	var result: string = td.turndown(html)

	// Clean tokens intentionally retained
	result = cleanPlaceholders(result)

	return result
}
