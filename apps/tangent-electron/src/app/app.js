import App from './App.svelte'

import './style/input.scss'
import './style/note.scss'
import './style/media.scss'

import * as pdfjs from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs'
console.log({pdfWorker})
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker

const app = new App({
	target: document.body,
})

export default app
