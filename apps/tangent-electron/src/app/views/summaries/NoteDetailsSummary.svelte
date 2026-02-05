<script lang="ts">
import { pluralize } from 'common/plurals'
import { lineToText } from 'common/typewriterUtils'
import type { NoteViewState } from 'app/model/nodeViewStates'
import { NoteDetailMode } from 'app/model/nodeViewStates/NoteViewState'

interface Props {
	state: Pick<NoteViewState, 'note'> & Partial<NoteViewState>
	mode?: NoteDetailMode
}

let {
	state: noteViewState,
	...props
}: Props = $props()

let note = $derived(noteViewState.note)
let stats = $state('')

let pendingDetailUpdate = false
updateDetails()

$effect(() => {
	if (note && $note && !pendingDetailUpdate) {
		pendingDetailUpdate = true
		// Delay the update of the details so that it's not happening in the same frame as a keypress
		setTimeout(() => {
			updateDetails()
			pendingDetailUpdate = false
		}, 10)
	}
})

function updateDetails() {
	const detailMode = props.mode ?? noteViewState.detailMode
	if ((detailMode & (NoteDetailMode.Words | NoteDetailMode.Characters)) === NoteDetailMode.None) {
		return	
	}

	let result = ''

	if (NoteDetailMode.Words === (detailMode & NoteDetailMode.Words)) {
		let wordCount = 0
		for (const line of note.lines) {
			const text = lineToText(line)
			wordCount += text.match(/\S+/g)?.length ?? 0
		}
		result += pluralize(
			wordCount,
			'$$ Words',
			'$$ Word',
			'No Words')
	}

	if (NoteDetailMode.Characters === (detailMode & NoteDetailMode.Characters)) {
		if (result.length > 0) result += ', '

		let characterCount = 0
		for (const line of note.lines) {
			characterCount += line.length
		}
		result += pluralize(
			characterCount,
			'$$ Characters',
			'$$ Character',
			'No Characters, Yet')
	}

	stats = result
}

</script>
<span>{stats}</span>