import { render } from 'pele'
let config = {} as unknown

/**
 * Records the configuration mermaid should use, without loading it.
 */
export function setMermaidConfig(newConfig: unknown) {
	config = newConfig
}

/**
 * Lazily loads and configures mermaid.
 */
export function getMermaid() {
		return {render: (src: string) => render(src, config)}		
}
