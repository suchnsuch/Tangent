const SveltePreprocess = require('svelte-preprocess');

module.exports = {
    preprocess: SveltePreprocess({
		scss: {
			silenceDeprecations: ['legacy-js-api']
		}
	})
};