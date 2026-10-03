// A `?url` import resolves to just a string, so this emits the worker file
// without pulling any of pdf.js into whatever chunk imports this module.
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

type Pdfjs = typeof import('pdfjs-dist')
type PdfViewer = typeof import('pdfjs-dist/web/pdf_viewer.mjs')

let loading: Promise<Pdfjs> = null
let loadingViewer: Promise<PdfViewer> = null

/**
 * Lazy load and configure pdf.js
 */
export function getPdfjs(): Promise<Pdfjs> {
	if (!loading) {
		loading = import('pdfjs-dist').then(pdfjs => {
			pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
			return pdfjs
		})
	}

	return loading
}

/**
 * Lazy-load the pdf viewer
 */
export async function getPdfViewer(): Promise<PdfViewer> {
	if (!loadingViewer) {
		// The viewer needs a configured worker before being loaded
		await getPdfjs()
		loadingViewer = Promise.all([
			import('pdfjs-dist/web/pdf_viewer.mjs'),
			import('pdfjs-dist/web/pdf_viewer.css')
		]).then(([viewer]) => viewer)
	}

	return loadingViewer
}
