export interface Props {
	className?: string
    [key: string]: any
}
export type Range = [number, number]
export type ChildList = VChild[]
export type VChild = string | VNode
export type Annotation = { type?: string } & Props
export type VNode = { annotation: Annotation, children: ChildList }

export function getChildLength(child: VChild) {
	if (typeof child === 'string') return child.length
	return child.children.reduce((t, c) => {
		return t + getChildLength(c)
	}, 0)
}

type AnnotationContext = {
	index: number
}

export function applyAnnotation(list: ChildList, annotation: Annotation, range: Range, context?: AnnotationContext): ChildList {
	context = context ?? { index: 0 }

	let newList: ChildList = null

	for (let i = 0; i < list.length; i++) {
		const result = annotateChild(list[i], annotation, range, context)
		if (result === false) {
			if (newList) {
				// Already creating a new list, add unchanged child
				newList.push(list[i])
			}
		}
		else {
			if (!newList) {
				// Fill the new list with previously unchanged items
				newList = list.slice(0, i)
			}
			if (Array.isArray(result)) {
				// Push the new array into the list
				Array.prototype.push.apply(newList, result)
			}
			else {
				newList.push(result)
			}
		}
	}

	return newList ?? list
}

function annotateChild(child: VChild, annotation: Annotation, range: Range, context: AnnotationContext): VChild | ChildList | false {
	const [from, to] = range
	const start = context.index
	if (typeof child === 'string') {
		const end = start + child.length
		context.index += child.length
		if (end <= from) return false // No-op; too early
		if (start > to) return false // No-op; too late
		if (from <= start && end <= to) {
			// Completely consumed
			return {
				annotation,
				children: [child]
			}
		}
		const result: ChildList = []

		if (from > start) {
			result.push(child.substring(0, from - start))
		}
		result.push({
			annotation,
			children: [child.substring(from - start, to - start)]
		})
		if (to < end) {
			result.push(child.substring(to - start))
		}
		return result
	}
	else {
		const newChildren = applyAnnotation(child.children, annotation, range, context)
		if (newChildren != child.children) {
			return {
				annotation: child.annotation,
				children: newChildren
			}
		}
		return false // No-op; nothing changed
	}
}

export function childrenToHTML(children: ChildList): string {
	let result = ''

	for (const child of children) {
		result += childToHTML(child)
	}

	return result
}

const keyRemaps = {
	'className': 'class'
} as const

export function childToHTML(child: VChild): string {
	if (typeof child === 'string') return child
	const type = child.annotation.type ?? 'span'
	let result = '<' + type
	for (const key of Object.keys(child.annotation)) {
		if (key === 'type') continue
		const mappedKey = keyRemaps[key] ?? key
		result += ' ' + mappedKey + '="' + child.annotation[key] + '"'
	}
	result += '>'
	result += childrenToHTML(child.children)
	result += '</' + type + '>'
	return result
}
