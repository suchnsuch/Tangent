import { EditorRange } from '@typewriter/document'

export function getInitialQuerySelection(text: string, previous: EditorRange = null): EditorRange | null {
	if (!text) return null
	
	let match = text.match(/^Notes with ['"]([^"']*)['"]$/di)
	if (match) {
		console.log(match)
		return (match as any).indices[1]
	}

	if (previous && previous[0] >= 0 && previous[0] <= text.length
		&& previous[1] >= 0 && previous[1] <= text.length
	) {
		return previous
	}

	return [text.length, text.length]
}
