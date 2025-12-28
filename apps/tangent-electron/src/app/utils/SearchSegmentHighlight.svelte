<script lang="ts">
import { type ChildList, childrenToHTML } from 'common/annotations/nodeAnnotations';
import { annotateMatchText, type SearchMatchResult } from 'common/search';
import '../style/highlights.scss'

export let value: string | SearchMatchResult
export let source: string | ChildList = undefined
export let start: number = 0
export let end: number = undefined

$: content = typeof value === 'string' ?
	value :
	childrenToHTML(annotateMatchText(value, source, start, end, 'match-highlight'))
</script>

<span>{@html content}</span>
