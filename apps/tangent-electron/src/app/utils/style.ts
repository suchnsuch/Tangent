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

/** Provides a "standard" value for smooth scrolling transition */
export const smoothScrollTime = 500
