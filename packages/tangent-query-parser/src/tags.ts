export function tokenizeTagName(name: string) {
	return name.split(/[\.\/]/)
}

export function tagContainsTag(containingTagNames: string[], testingTagNames: string[]) {
	if (containingTagNames === testingTagNames) return true
	if (containingTagNames.length > testingTagNames.length) return false

	for (let i = 0; i < containingTagNames.length; i++) {
		if (containingTagNames[i] !== testingTagNames[i]) return false
	}
	return true
}
