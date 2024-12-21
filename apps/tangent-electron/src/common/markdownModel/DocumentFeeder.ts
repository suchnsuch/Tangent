import CharacterFeeder from "./CharacterFeeder"

import { lineToText, typewriterToText } from '../typewriterUtils'
import type { TextDocument, Line } from '@typewriter/document'

/**
 * A feeder that can continue feeding lines from a document
 */
export default class DocumentFeeder extends CharacterFeeder {
	doc: TextDocument
	startLine: number
	endLine: number

	constructor(doc: TextDocument, startLine: number, endLine: number) {
		
		super(typewriterToText(doc, startLine, endLine))

		this.doc = doc
		this.startLine = startLine
		this.endLine = endLine
	}

	hasMore(hard=false) {
		if (hard) {
			return this.endLine < this.doc.lines.length - 1 || super.hasMore()
		}
		return super.hasMore()
	}

	get isStartOfDocument() {
		return this.startLine === 0 && this.index === 0
	}

	next(step=1, hard=false) {
		if (hard && this.index + step >= this.text.length && this.endLine < this.doc.lines.length - 1) {
			// Throw the next line into the text
			this.endLine += 1
			this.text += '\n' + lineToText(this.doc.lines[this.endLine])
		}
		return super.next(step)
	}

	injectAdjacentLinesWhile(predicate: (line: Line) => boolean) {
		const lines = this.doc.lines
		let endIndex = this.endLine
		while (endIndex < lines.length - 1) {
			const nextIndex = endIndex + 1
			const nextLine = lines[nextIndex]
			if (predicate(nextLine)) {
				endIndex = nextIndex
				this.text += '\n' + lineToText(nextLine)
			}
			else {
				break
			}
		}

		this.endLine = endIndex
		if (this.currentChar === undefined) {
			// Re-grab the current character
			// this fixes an issue where the was beyond the old text range,
			// causing issues when creating subsequent lines
			this.currentChar = this.text[this.index]
		}
	}
}
