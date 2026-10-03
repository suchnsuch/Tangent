import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'
import { defineConfig, type Plugin } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tsconfigPaths from 'vite-tsconfig-paths'
import { visualizer } from 'rollup-plugin-visualizer'

const root = import.meta.dirname

/**
 * Turn on visualizer with `VISUALIZE_RENDERER=1 npm run build`
 * Turn on and open visualizer with `VISUALIZE_RENDERER=open npm run build`
 */
const visualize = process.env.VISUALIZE_RENDERER
const willVisualize = Boolean(visualize)

const prismRoot = path.dirname(createRequire(import.meta.url).resolve('prismjs/package.json'))

/**
 * Exposes prism's language definitions as `virtual:prism-languages`, a map of
 * language name to a dynamic import of its definition.
 *
 * Each language is only fetched the first time a code block asks for it.
 */
function prismLanguages(): Plugin {
	const virtualId = 'virtual:prism-languages'
	const resolvedId = '\0' + virtualId
	const componentMatch = /^prism-([\w+-]+)\.min\.js$/

	return {
		name: 'tangent-prism-languages',
		resolveId(id) {
			if (id === virtualId) return resolvedId
		},
		load(id) {
			if (id !== resolvedId) return

			const componentsDir = path.join(prismRoot, 'components')
			const entries = fs.readdirSync(componentsDir)
				.map(file => ({ file, match: componentMatch.exec(file) }))
				.filter(entry => entry.match)
				.map(({ file, match }) => `\t${JSON.stringify(match[1])}: () => import(${JSON.stringify(path.join(componentsDir, file))})`)

			return `export default {\n${entries.join(',\n')}\n}`
		}
	}
}

/**
 * The renderer.
 *
 * The whole point of the layout here is that development and release have the
 * same shape. `src/app` holds the document, `static` is dropped in next to it,
 * and the build writes both plus the bundle into a single directory:
 *
 *     __build/renderer/
 *       index.html
 *       assets/*.js *.css *.woff2
 *       <everything from static/>
 *
 * In development vite serves that same arrangement from its dev server. Because
 * the document sits at the root of the tree in both cases, every url the app
 * builds at runtime -- `window.svg#minimize`, `./t-embed.css`, `./math.css` --
 * resolves the same way in both, with no build step rewriting anything.
 */
export default defineConfig({
	root: path.join(root, 'src/app'),
	publicDir: path.join(root, 'static'),

	build: {
		outDir: path.join(root, '__build/renderer'),
		emptyOutDir: true,
		sourcemap: true,
		target: 'chrome130'
	},

	plugins: [
		prismLanguages(),
		svelte({
			configFile: path.join(root, 'svelte.config.mjs')
		}),
		tsconfigPaths({
			projects: [path.join(root, 'tsconfig.json')]
		}),
		willVisualize && visualizer({
			filename: path.join(root, '__build/renderer_stats.html'),
			sourcemap: true,
			gzipSize: true,
			open: visualize === 'open',
		}),
	],

	resolve: {
		// The defaults from https://vite.dev/config/shared-options.html#resolve-conditions
		// plus 'svelte', so that typewriter-editor's export map resolves
		conditions: ['module', 'browser', 'development|production', 'svelte']
	},

	server: {
		// Electron is the only client; picking a fixed port keeps the url stable
		port: 5199,
		strictPort: true
	}
})
