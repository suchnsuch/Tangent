import { Line, Delta, AttributeMap } from '@typewriter/document'

export interface LinesBuilderOptions {
}

export default class LinesBuilder {

	lines: Line[] = []
	spans = []

	openFormats: { [key: string]: AttributeMap } = {}
	openLineFormats: { [key: string]: AttributeMap } = {}

	constructor(options?: LinesBuilderOptions) {
	}

	addSpan(content: string, attributes?: AttributeMap) {
		if (!content.length) return

		let finalAttributes: AttributeMap = {}

		Object.assign(finalAttributes, ...Object.values(this.openFormats), attributes)

		this.spans.push({
			insert: content,
			attributes: finalAttributes
		})
	}

	buildLine(attributes?: AttributeMap) {

		let finalAttributes: AttributeMap = {}

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
