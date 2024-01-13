export function classesToSelector(classes: string) {
	const split = classes.split(/\s+/).filter(i => i)
	if (split.length) {
		return '.' + split.join('.')
	}
	return ''
}

export function getPixelValue(someCssString: string) {
	return parseFloat(someCssString.substring(0, someCssString.length - 2))
}
