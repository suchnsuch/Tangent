import type NoteParser from './NoteParser'

/**
 * `true` groups hidden markup with its content. A string also identifies the
 * inline instance, so that adjacent instances never share attributes.
 */
export type HiddenGroup = true | string

/**
 * Identifies the span `[start, end)` by its offsets relative to the start of
 * its line, so the id only changes when the span moves within that line.
 */
export function getInlineId(parser: NoteParser, start: number, end: number) {
	return `${start - parser.lineStart}-${end - parser.lineStart}`
}
