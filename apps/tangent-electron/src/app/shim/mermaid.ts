type Mermaid = typeof import('mermaid').default
type MermaidInitializeArgs = Parameters<Mermaid['initialize']>[0]

let loading: Promise<Mermaid> = null
let config: MermaidInitializeArgs = null

/**
 * Records the configuration mermaid should use, without loading it.
 */
export function setMermaidConfig(newConfig: MermaidInitializeArgs) {
	config = newConfig

	// Only reconfigure if something has already caused mermaid to load
	if (loading) {
		loading.then(mermaid => mermaid.initialize(config))
	}
}

/**
 * Lazily loads and configures mermaid.
 */
export function getMermaid(): Promise<Mermaid> {
	if (!loading) {
		loading = import('mermaid').then(module => {
			const mermaid = module.default
			if (config) {
				mermaid.initialize(config)
			}
			return mermaid
		})
	}

	return loading
}
