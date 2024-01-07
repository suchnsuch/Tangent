<script lang="ts">
import { extractLeadingEmoji } from 'common/utils'

export let text: string
export let defaultEmoji: string = null

let emojiData = null

$: buildNamePieces(text)
function buildNamePieces(text) {
	emojiData = extractLeadingEmoji(text)
}
</script>

{#if emojiData}
	<span class="icon">{emojiData.emoji}</span><span class="text">{emojiData.remainder.trim()}</span>
{:else}
	<span class="icon" class:hidden={!defaultEmoji}>{defaultEmoji ?? '🤫'}</span><span class="text">{text}</span>
{/if}

<style>
.icon {
	font-size: 125%;
	width: 1.25em;
	text-align: center;
	/*height: 1.25em;*/

	padding-right: .5em;
}

.icon.hidden {
	visibility: hidden;
}
</style>