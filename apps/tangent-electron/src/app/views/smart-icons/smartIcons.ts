export function rawOrPx(value: string | number) {
	return typeof value === 'number' ? `${value}px` : value
}

export function sizeToStyle(size: number | string, width?: number | string, height?: number | string) {
	const realWidth = rawOrPx(width ?? size ?? 24)
	const realHeight = rawOrPx(height ?? size ?? 24)
	return `width: ${realWidth}; height: ${realHeight};`
}
