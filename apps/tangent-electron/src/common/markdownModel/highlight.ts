const highlight = [
	'🔴', '🟥', '🟠', '🟧', '🟡', '🟨', '🟢', '🟩', '🔵', '🟦', '🟣', '🟪'
]

// See https://stackoverflow.com/questions/37089427/javascript-find-emoji-in-string-and-parse
export const highlightEmojiMatch = new RegExp(highlight.join('|'))

export function highlightEmojiToClassDescriptor(emoji: string) {
	switch (emoji) {
		case '🔴':
			return 'red circle'
		case '🟥':
			return 'red square'
		case '🟠':
			return 'orange circle'
		case '🟧':
			return 'orange square'
		case '🟡':
			return 'yellow circle'
		case '🟨':
			return 'yellow square'
		case '🟢':
			return 'green circle'
		case '🟩':
			return 'green square'
		case '🔵':
			return 'blue circle'
		case '🟦':
			return 'blue square'
		case '🟣':
			return 'purple circle'
		case '🟪':
			return 'purple square'
	}
}