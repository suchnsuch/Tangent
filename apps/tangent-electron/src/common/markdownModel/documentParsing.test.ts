import { describe, it, expect, beforeEach } from 'vitest'
import { markdownToTextDocument } from './parser'
import DocumentFeeder from './DocumentFeeder'
import NoteParser from './NoteParser'
import CharacterFeeder from './CharacterFeeder'
import { ParsingContextType } from './parsingContext'
import { lineToText } from 'common/typewriterUtils'
import { Line } from '@typewriter/document'

function stripIds(lines: Line[]): Line[] {
	lines.forEach(l => delete l.id)
	return lines
}

describe('Document extension & lines', () => {
	const text = `Line one
Line two
Line three
Line four`

	const doc = markdownToTextDocument(text)

	let docParser: NoteParser
	let textParser: NoteParser

	beforeEach(() => {
		const docFeed = new DocumentFeeder(doc, 0, 0)
		docParser = new NoteParser(docFeed)

		const textFeed = new CharacterFeeder(text)
		textParser = new NoteParser(textFeed)

		const fakeContext = {
			type: ParsingContextType.Block,
			indent: '',
			programs: []
		}
		textParser.pushContext(fakeContext)
		docParser.pushContext(fakeContext)
	})
	
	it('Should have the right text', () => {
		expect(docParser.feed.text).toEqual('Line one')
	})

	it('Should create lines when extended', () => {
		for (let i = 0; i < 'Line one'.length + 1; i++) {
			docParser.moveNext(true, true)
			textParser.moveNext()

			expect(docParser.feed.currentChar).toEqual(textParser.feed.currentChar)
		}

		expect(docParser.builder.lines.map(lineToText))
			.toEqual(textParser.builder.lines.map(lineToText))
	})

	it('Should create lines when lines are consumed', () => {

		const docLine = docParser.feed.getLineText(docParser.feed.index, true)
		const textLine = textParser.feed.getLineText(textParser.feed.index, true)

		expect(docLine).toEqual(textLine)
		// expect(docParser.feed.currentChar).toEqual(textParser.feed.currentChar)

		docParser.moveNext(true, true)
		textParser.moveNext(true, true)

		expect(stripIds(docParser.builder.lines))
			.toEqual(stripIds(textParser.builder.lines))
	})

	it('Should be able to move next by a value', () => {

		const docLine = docParser.feed.nextByLength(8)
		const textLine = textParser.feed.nextByLength(8)

		expect(docParser.feed.index).toEqual(docParser.feed.index)

		docParser.moveNext(true, true)
		textParser.moveNext(true, true)

		expect(stripIds(docParser.builder.lines))
			.toEqual(stripIds(textParser.builder.lines))
		// expect(docParser.feed.currentChar).toEqual(textParser.feed.currentChar)
	})
})
