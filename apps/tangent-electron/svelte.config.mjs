import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

export default {
	// Running scss through vite rather than svelte-preprocess means component
	// styles and standalone .scss files go through exactly the same pipeline.
	preprocess: vitePreprocess(),

	onwarn(warning, handler) {
		switch (warning.code) {
			// Tangent leans on mouse interactions in places where the keyboard
			// equivalent is provided by a command instead.
			case 'a11y_click_events_have_key_events':
			case 'a11y_no_noninteractive_tabindex':
			case 'a11y_no_noninteractive_element_interactions':
			case 'a11y_no_static_element_interactions':
			// Selectors are frequently used by elements outside of the component
			case 'css_unused_selector':
				return
		}

		handler(warning)
	}
}
