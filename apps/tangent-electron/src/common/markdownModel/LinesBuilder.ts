import { Line, Delta, AttributeMap } from '@typewriter/document'
import { negativeInlineFormats } from './typewriterTypes'

export interface LinesBuilderOptions {
	asFormatting?: boolean
}

export default class LinesBuilder {
	outputFormattingRetains: boolean

	lines: Line[] = []
	spans = []

	openFormats: { [key: string]: AttributeMap } = {}
	openLineFormats: { [key: string]: AttributeMap } = {}

	constructor(options?: LinesBuilderOptions) {
		this.outputFormattingRetains = options?.asFormatting ?? false
	}

	addSpan(content: string, attributes?: AttributeMap) {
		if (!content.length) return

		let finalAttributes: AttributeMap = {}

		if (this.outputFormattingRetains) {
			Object.assign(finalAttributes, negativeInlineFormats)
		}

		Object.assign(finalAttributes, ...Object.values(this.openFormats), attributes)

		if (this.outputFormattingRetains) {
			this.spans.push({
				retain: content.length,
				attributes: finalAttributes
			})
		}
		else {
			this.spans.push({
				insert: content,
				attributes: finalAttributes
			})
		}
	}

	buildLine(attributes?: AttributeMap) {

		let finalAttributes: AttributeMap = {}

		if (this.spans.length === 0) {
			finalAttributes.empty = true
		}

		if (this.spans.length === 1 && this.spans[0].attributes?.line_format === 'indent') {
			finalAttributes.whitespace = true
		}

		Object.assign(finalAttributes, ...Object.values(this.openLineFormats), attributes)

		this.lines.push(Line.create(new Delta(this.spans), finalAttributes))
		this.spans = []
		this.openFormats = {}
	}

	addOpenFormat(key: string, attributes: AttributeMap) {
		this.openFormats[key] = attributes
	}

	hasOpenFormat(key: string) {
		return key in this.openFormats
	}

	dropOpenFormat(key: string) {
		delete this.openFormats[key]
	}

	addOpenLineFormat(key: string, attributes: AttributeMap) {
		this.openLineFormats[key] = attributes
	}
	
	dropOpenLineFormat(key: string) {
		delete this.openLineFormats[key]
	}
}
