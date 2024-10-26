import type { FormatType, LineType, TypesetTypes } from 'typewriter-editor/dist/typesetting'
import { h, Props } from 'typewriter-editor/dist/rendering/vdom'

export interface TokenAttributes {
	className: string
	value: string
	index: number
}

export const queryTypeset:TypesetTypes = {
	lines: [
		{
			name: 'line',
			selector: 'p',
			render: (attributes, children) => {
				return h('p', null, children)
			}
		}
	],
	formats: [
		{
			name: 'token',
			selector: 'span.token',
			render: (attributes, children) => {

				const { className, value, index } = attributes.token as TokenAttributes
				
				let props = {
					className: 'token ' + className,
					'data-value': value,
					'data-index': index
				} as Props

				return h('span', props, children)
			}
		},
		{
			name: 'error',
			selector: 'span.error',
			render: (attributes, children) => {

				let props = {
					className: 'error',
					title: attributes.error
				} as Props

				return h('span', props, children)
			}
		}
	]
}
