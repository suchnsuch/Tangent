import { mount } from 'svelte'

// Must come before anything that parses a note
import './shim/prism'

import App from './App.svelte'

import './style/input.scss'
import './style/note.scss'

// Imported rather than linked so that vite emits the fonts it references.
// See: https://github.com/mdn/interactive-examples/issues/887#issuecomment-470703209
import 'katex/dist/katex.min.css'

const app = mount(App, {
	target: document.body,
})

export default app
