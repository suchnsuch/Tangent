export function pluralize(value: number, plural: string, single: string, none?: string) {
	if (value === 1) {
		return injectValue(single, value)
	}
	if (value === 0 && none) {
		return injectValue(none, value)
	}
	return injectValue(plural, value)
}

function injectValue(text: string, value) {
	// There is probably some convention I should follow, but I'm
	// not going searching for something I don't know how to find
	return text.replace('$$', value)
}
