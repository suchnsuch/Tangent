export function createStyleElement(href: string) {
    const style = document.createElement('link')
    style.setAttribute('rel', 'stylesheet')
    style.setAttribute('href', href)
    return style
}