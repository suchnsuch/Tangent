<script lang="ts">
import { decodeSortMode } from "app/model/directoryView";

export let sortMode: string = 'name|ascending'
export let size = 24

$: decoded = decodeSortMode(sortMode)

// The bizzarre usage of ternary operators means the svg elements don't flicker
// in and out as their conditions change
function hasFullGlyph(mode) {
	switch (mode) {
		case 'name|ascending':
		case 'name|descending':
			return true
	}
	return false
}

function usesClock(key) {
	switch (key) {
		case 'created':
		case 'modified':
			return true
	}
	return false
}

</script>

<svg style={`width: ${size}px; height: ${size}px;`}>
	<use href={'sorting.svg#' + sortMode} />

	<use href={'sorting.svg#' + (usesClock(decoded.key) ? 'clock' : '')} />

	<use href={'sorting.svg#' + (hasFullGlyph(sortMode) ? '' : decoded.order)} />
	<use href={'sorting.svg#' + (hasFullGlyph(sortMode) ? '' : decoded.key)} />
</svg>
