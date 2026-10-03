let loading: Promise<unknown> = null

export function loadMediaChrome() {
	if (!loading) {
		loading = Promise.all([
			// Defer importing & registering custom media elements until actual usage
			import('media-chrome'),
			import('media-chrome/menu')
		])
	}
	return loading 
}
