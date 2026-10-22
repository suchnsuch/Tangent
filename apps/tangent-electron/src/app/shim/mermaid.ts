import { render, type RenderOptions  } from 'pele'
let config: RenderOptions = null

/**
 * Records the configuration mermaid should use, without loading it.
 */
export function setMermaidConfig(newConfig: RenderOptions) {
	config = newConfig
}

/**
 * Lazily loads and configures mermaid.
 */
export function getMermaid() {
		return {render: (src: string) => render(src, config)}		
}
