import { describe, expect, test } from 'vitest'
import { typewriterToText } from 'common/typewriterUtils'
import { markdownToTextDocument, parseMarkdown } from './parser'
import { scanFuriganaSpan } from './furigana'

describe('scanFuriganaSpan', () => {
	test.each([
		['{ 漢字 | かんじ }', { base: '漢字', reading: 'かんじ' }],
		['{ é | combining }', { base: 'é', reading: 'combining' }],
	])('parses %s', (source, furigana) => {
		expect(scanFuriganaSpan(source)).toEqual({
			type: 'valid',
			end: source.length - 1,
			furigana
		})
	})

	test('escaped separators remain literal display text', () => {
		expect(scanFuriganaSpan('{ Foo\\|Bar | フーバー }')).toMatchObject({
			furigana: { base: 'Foo|Bar', reading: 'フーバー' }
		})
	})

	test('uses the first separator', () => {
		expect(scanFuriganaSpan('{ term | text | more }')).toMatchObject({
			furigana: { base: 'term', reading: 'text | more' }
		})
	})

	test.each([
		'{ no separator }',
		'{ | reading }',
		'{ base | }',
		'{ base | reading',
		'{ base |\n reading }',
		'\\{ base | reading }',
	])('rejects malformed or inactive source: %s', source => {
		expect(scanFuriganaSpan(source).type).toBe('invalid')
	})

	test('an inner opener invalidates the span at its own index', () => {
		expect(scanFuriganaSpan('{{ nested | reading } | more }')).toEqual({
			type: 'nested',
			end: 1
		})
	})

	test('balances escaped braces without treating them as nesting', () => {
		expect(scanFuriganaSpan('{ \\{base\\} | reading }')).toMatchObject({
			furigana: { base: '{base}', reading: 'reading' }
		})
	})

	test('does not let trim consume half of a trailing escape pair', () => {
		expect(scanFuriganaSpan('{ base | reading\\ }')).toMatchObject({
			furigana: { base: 'base', reading: 'reading ' }
		})
	})

	test('unescapes any escaped character except another backslash', () => {
		expect(scanFuriganaSpan('{ back\\\\slash | \\a }')).toMatchObject({
			furigana: { base: 'back\\slash', reading: 'a' }
		})
	})

	test('a backslash cannot escape another backslash', () => {
		// The rightmost of the pair still escapes whatever follows it (here,
		// the trailing space that would otherwise be trimmed) - a run of
		// backslashes resolves left to right, never by parity of the whole run.
		expect(scanFuriganaSpan('{ base | x\\\\ }')).toMatchObject({
			furigana: { base: 'base', reading: 'x\\ ' }
		})
	})

	test.each([
		'{ base | reading\\\n}',
		'{ base | reading\\\r}',
	])('a backslash cannot escape a line break: %j', source => {
		expect(scanFuriganaSpan(source).type).toBe('invalid')
	})
})

describe('furigana markdown parsing', () => {
	test.each([
		'Before { 漢字 | かんじ } after',
		'**bold { 字 | じ } text**',
		'`{ code | inactive }`',
		'```\n{ fenced | inactive }\n```',
		'\\{ escaped | opener }',
		'{{ nested | reading } | more }',
	])('round-trips %s', source => {
		const document = markdownToTextDocument(source)
		expect(typewriterToText(document)).toBe(source)
	})

	test('stores the complete source as one attributed span', () => {
		const source = 'Before { 漢字 | かんじ } after'
		const line = parseMarkdown(source).lines[0]
		const furiganaOp = line.content.ops.find(op => op.attributes?.furigana)

		expect(furiganaOp).toEqual({
			insert: '{ 漢字 | かんじ }',
			attributes: {
				furigana: {
					base: '漢字',
					reading: 'かんじ',
					instance: '7-19'
				},
				hiddenGroup: true
			}
		})
	})

	test('adjacent identical spans get distinct instances', () => {
		const line = parseMarkdown('{a|b}{a|b}').lines[0]
		const instances = line.content.ops
			.filter(op => op.attributes?.furigana)
			.map(op => op.attributes.furigana.instance)

		expect(instances).toEqual(['0-5', '5-10'])
	})

	test('escaped opener hides its backslash without activating furigana', () => {
		const line = parseMarkdown('\\{ base | reading }').lines[0]
		expect(line.content.ops.some(op => op.attributes?.furigana)).toBe(false)
		expect(line.content.ops[0]).toEqual({
			insert: '\\',
			attributes: { link_internal: true, hidden: true }
		})
	})

	test('an escaped closer hides its backslash like the escaped opener', () => {
		const line = parseMarkdown('\\{not an annotation\\}').lines[0]
		const hiddenBackslashes = line.content.ops.filter(op => op.insert === '\\' && op.attributes?.hidden)
		expect(hiddenBackslashes).toHaveLength(2)
	})

	test('a trailing backslash before a line break stays inert rather than merging lines', () => {
		const source = 'Before { base | reading\\\nafter'
		const document = markdownToTextDocument(source)
		expect(typewriterToText(document)).toBe(source)
		expect(document.lines.length).toBe(2)

		const furiganaOp = document.lines.flatMap(line => line.content.ops)
			.find(op => op.attributes?.furigana)
		expect(furiganaOp).toBeUndefined()
	})

	test('a rejected nested opener does not leave its inner brace active', () => {
		// scanFuriganaSpan already rejects the outer attempt at the nested
		// '{' (covered by its own unit test above); the full pipeline must
		// also not retry at that inner brace and rescue it as its own span.
		const line = parseMarkdown('{{ nested | reading } | more }').lines[0]
		expect(line.content.ops.some(op => op.attributes?.furigana)).toBe(false)
	})

	test('does not activate in inline or fenced code', () => {
		const inline = parseMarkdown('`{ code | inactive }`').lines[0]
		expect(inline.content.ops.some(op => op.attributes?.furigana)).toBe(false)

		const fenced = parseMarkdown('```\n{ fenced | inactive }\n```').lines[1]
		expect(fenced.content.ops.some(op => op.attributes?.furigana)).toBe(false)
	})
})
