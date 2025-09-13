import mermaid from 'mermaid'

/**
 * Mermaid hard codes styling properties on every single diagram.
 * This at least ensures diagrams are _reasonably_ reactive to style changes.
 * @param darkMode 
 */
export function updateMermaidStyle(darkMode: boolean) {

	const style = getComputedStyle(document.body)

	const hueValue = parseFloat(style.getPropertyValue('--accentHue'))
	const saturationValue = parseFloat(style.getPropertyValue('--accentSaturation'))
	const lightness = darkMode ? 25 : 55

	// All of this is based on deciphering https://github.com/mermaid-js/mermaid/blob/develop/packages/mermaid/src/themes/theme-base.js
	const themeVariables = {
		darkMode,
		fontFamily: 'var(--fontFamily)',
		fontSize: 'var(--fontSize)',

		background: style.getPropertyValue('--noteBackgroundColor'),
		primaryColor: style.getPropertyValue('--backgroundColor'),

		primaryTextColor: style.getPropertyValue('--textColor'),
		noteTextColor: style.getPropertyValue('--textColor'),
		noteBkgColor: style.getPropertyValue('--noteBackgroundColor'),

		/** Pie Charts */
		pie1: 'hsl(var(--accentHue), var(--accentSaturation), calc(var(--accentLightness) * 1.2))',
		pie2: 'hsl(calc(var(--accentHue) + 120), var(--accentSaturation), calc(var(--accentLightness) * 1.2))',
		pie3: 'hsl(calc(var(--accentHue) - 120), var(--accentSaturation), calc(var(--accentLightness) * 1.2))',

		pie4: 'hsl(var(--accentHue), var(--accentSaturation), calc(var(--accentLightness) * 1.0))',
		pie5: 'hsl(calc(var(--accentHue) + 120), var(--accentSaturation), calc(var(--accentLightness) * 1.0))',
		pie6: 'hsl(calc(var(--accentHue) - 120), var(--accentSaturation), calc(var(--accentLightness) * 1.0))',

		pie7: 'hsl(var(--accentHue), var(--accentSaturation), calc(var(--accentLightness) * .8))',
		pie8: 'hsl(calc(var(--accentHue) + 120), var(--accentSaturation), calc(var(--accentLightness) * .8))',
		pie9: 'hsl(calc(var(--accentHue) - 120), var(--accentSaturation), calc(var(--accentLightness) * .8))',

		pie10: 'hsl(var(--accentHue), var(--accentSaturation), calc(var(--accentLightness) * .6))',
		pie11: 'hsl(calc(var(--accentHue) + 120), var(--accentSaturation), calc(var(--accentLightness) * .6))',
		pie12: 'hsl(calc(var(--accentHue) - 120), var(--accentSaturation), calc(var(--accentLightness) * .6))',

		pieStrokeColor: 'var(--borderColor)',
		pieOuterStrokeColor: 'var(--borderColor)',

		/** Git */
		git0: `hsl(${hueValue}, ${saturationValue}%, ${lightness}%)`,
		git1: `hsl(${hueValue + 120}, ${saturationValue}%, ${lightness}%)`,
		git2: `hsl(${hueValue - 120}, ${saturationValue}%, ${lightness}%)`,
		git3: `hsl(${hueValue + 180}, ${saturationValue}%, ${lightness}%)`,
		git4: `hsl(${hueValue - 60}, ${saturationValue}%, ${lightness}%)`,
		git5: `hsl(${hueValue - 90}, ${saturationValue}%, ${lightness}%)`,
		git6: `hsl(${hueValue - 180}, ${saturationValue}%, ${lightness}%)`,
		git7: `hsl(${hueValue - 180}, ${saturationValue}%, ${lightness}%)`,
		branchLabelColor: 'var(--textColor)',

		/** Gant */
		excludeBkgColor: darkMode ? 'black' : 'var(--backgroundColor)',
	}

	console.log(themeVariables)

	mermaid.initialize({
		startOnLoad: false,
		theme: 'base',
		themeVariables,

		// Mindmap styling appears to be explicitly broken
		themeCSS: `
.mindmap-node {
	fill: var(--backgroundColor);
}
.edgePaths .edge {
	stroke: var(--borderColor) !important;
}
		`
	})
}
