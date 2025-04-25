import { describe, it, expect } from 'vitest'
import { markdownToTextDocument } from './parser'
import DocumentFeeder from './DocumentFeeder'
import NoteParser from './NoteParser'
import CharacterFeeder from './CharacterFeeder'
import { ParsingContextType } from './parsingContext'
import { lineToText } from 'common/typewriterUtils'

describe('Document extension & lines', () => {
	const text = `Line one
Line two
Line three
Line four`

	const doc = markdownToTextDocument(text)
	
	const docFeed = new DocumentFeeder(doc, 0, 0)
	const docParser = new NoteParser(docFeed)

	const textFeed = new CharacterFeeder(text)
	const textParser = new NoteParser(textFeed)

	const fakeContext = {
		type: ParsingContextType.Block,
		indent: '',
		programs: []
	}
	textParser.pushContext(fakeContext)
	docParser.pushContext(fakeContext)

	it('Should have the right text', () => {
		expect(docFeed.text).toEqual('Line one')
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
		expect(docParser.feed.currentChar).toEqual(textParser.feed.currentChar)
	})
})
