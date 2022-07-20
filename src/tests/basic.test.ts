import { getTQGrammar } from './test-loader'

test('The basics', async () => {
	const grammar = await getTQGrammar()
	if (grammar == null) throw 'Null Grammar'

	const text = 'Notes with [[My Link]]'

	const { tokens } = grammar.tokenizeLine(text, null)
	console.log(tokens)
})