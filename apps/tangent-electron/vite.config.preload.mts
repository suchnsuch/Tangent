import path from 'path'
import { defineConfig } from 'vite'

const root = import.meta.dirname

/**
 * The preload script config
 */
export default defineConfig({
	build: {
		ssr: path.join(root, 'src/preload/index.ts'),
		outDir: path.join(root, '__build/preload'),
		emptyOutDir: true,
		sourcemap: true,
		target: 'chrome130',
		minify: false,
		rollupOptions: {
			output: {
				format: 'cjs',
				entryFileNames: 'preload.js'
			}
		}
	},

	ssr: {
		noExternal: true,
		external: ['electron']
	},

	resolve: {
		tsconfigPaths: true
	}
})
