/**
 * Registers a custom element, tolerating the module being evaluated more than
 * once.
 */
export function defineCustomElement(name: string, constructor: CustomElementConstructor) {
	// Hot-reloading will cause duplicate attempts to define. This prevents that.
	if (customElements.get(name)) return

	customElements.define(name, constructor)
}
