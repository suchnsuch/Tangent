import { test, expect } from './tangent'

import fs from 'fs'
import path from 'path'

/**
 * Prism's language definitions used to be copied into place by the build and
 * pulled in with `<script>` tags. They are dynamic imports now, one chunk per
 * language, fetched the first time a code block asks for one.
 *
 * `js` is built into prism's core; the others each have to be fetched, so they
 * are what actually exercises the loader.
 */
const note = [
	'```js',
	'const alreadyBuiltIn = true',
	'```',
	'',
	'```yaml',
	'key: value',
	'```',
	'',
	'```rust',
	'fn main() {}',
	'```',
	''
].join('\n')

test('Code blocks load their language definitions on demand', async ({ tangent, workspace }) => {
	await fs.promises.writeFile(path.join(workspace, 'Highlighting.md'), note)

	const window = await tangent.firstWindow()

	await window.page.evaluate(() => {
		(document as any).workspace.navigateTo({ link: { href: 'Highlighting', form: 'wiki' } })
	})

	// The definitions are fetched after the first parse discovers it needs them,
	// so the note gets parsed a second time once they land
	await expect.poll(
		() => window.page.evaluate(() => {
			const prism = (window as any).Prism
			return {
				yaml: Boolean(prism?.languages?.yaml),
				rust: Boolean(prism?.languages?.rust)
			}
		}),
		{ timeout: 20000, message: 'lazily loaded prism definitions should register' }
	).toEqual({ yaml: true, rust: true })

	// And the note should actually be highlighted with them
	await expect.poll(
		() => window.page.evaluate(() =>
			document.querySelectorAll('.token.keyword, .token.key, .token.function').length),
		{ timeout: 20000, message: 'code should be highlighted' }
	).toBeGreaterThan(0)
})
