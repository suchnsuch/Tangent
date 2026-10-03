let loading: Promise<typeof import('katex')> = null

export function getKatex() {
	if (!loading) {
		loading = (async () => {
			const katex = await import('katex')
			await import('katex/contrib/mhchem/mhchem.js')
			return katex
		})()
	}
	return loading
	
}
