<script lang="ts">
import { FocusLevel } from 'common/dataTypes/TangentInfo'

export let focusLevel: FocusLevel = FocusLevel.File
export let size = 24
</script>

<svg style={`width: ${size}px; height: ${size}px;`}>
{#if focusLevel >= FocusLevel.File}
	<use href="focus.svg#typewriter"
		style={`opacity: ${focusLevel >= FocusLevel.Typewriter ? 1 : 0}; transition: opacity .5s;`}/>
	<use href="focus.svg#alt-paragraphs"
		style={`opacity: ${focusLevel >= FocusLevel.Paragraph ? .5 : 1}; transition: opacity .5s;`}/>
	<use href="focus.svg#focus-paragraphs-alt-lines"
		style={`opacity: ${focusLevel >= FocusLevel.Sentence ? .5 : 1}; transition: opacity .5s;`}/>
	<use href="focus.svg#focus-paragraphs-focus-lines"/>
{:else if focusLevel === FocusLevel.Thread}
	<use href="thread.svg#thread" />
{:else if focusLevel === FocusLevel.Map}
	<use href="map.svg#map" />
{/if}
</svg>
