import type NoteParser from './NoteParser'

export enum ParsingContextType {
	Block,
	Inline
}

export type ParsingContext = {
	type: ParsingContextType
	/** The individual formatting programs that are active in this context. */
	programs: ParsingProgram[]
	/** The minimum indent level of this context. Differing indents exit the context. */
	indent: string
	/** A program that runs when this context is dropped. */
	exit?: ExitProgram
}

export type ParsingProgram = (char: String, parser: NoteParser, context?: ParsingContext) => boolean
export type ExitProgram = (lastIndex: number, context: ParsingContext, parser: NoteParser) => void
