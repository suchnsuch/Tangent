export function createStyleElement(href: string) {
    const style = document.createElement('link')
    style.setAttribute('rel', 'stylesheet')
    style.setAttribute('href', href)
    return style
}

export function computeBoundingBox(html: string, parent: HTMLElement) {
	const temp = document.createElement('div')
	temp.innerHTML = html
	temp.style.position = 'absolute'
	temp.style.visibility = 'hidden'
	parent.appendChild(temp)
	const boundingBox = temp.getBoundingClientRect()
	parent.removeChild(temp)
	return boundingBox
}
