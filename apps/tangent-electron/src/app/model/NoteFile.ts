import type { TreeNode } from 'common/trees'
import File from "./File"
import { Line } from '@typewriter/document'

import type Workspace from './Workspace'
import { parseMarkdown } from 'common/markdownModel'
import { areLineArraysOpTextEquivalent, typewriterToText } from 'common/typewriterUtils'

export default class NoteFile extends File implements TreeNode {

	_waitFlag: number

	_lines: Line[]

	constructor(node: TreeNode, workspace: Workspace) {
		super(node, workspace)
	}

	get lines() {
		if (this._lines == null) {
			this._lines = []
		}
		return this._lines
	}
	set lines(value: Line[]) {
		if (this.isReady && !areLineArraysOpTextEquivalent(this._lines, value)) {
			this._lines = value
			this.isDirty = true
			if (this.meta?.virtual && this.loadState !== 'loaded') {
				this.loadState = 'loaded'
			}
			this.notifyChanged()
		}
	}

	get length() {
		if (!this._lines) return 0
		let total = 0
		for (const line of this._lines) {
			total += Line.length(line)
		}
		return total
	}

	getFileContent(): string {
		const lines = this._lines
		if (lines) {
			return typewriterToText(lines)
		}
	}

	integrateFrom(node: TreeNode): void {

		if (!this.meta?.virtual && node.meta?.virtual) {
			// This node is being deleted but is still referenced by other notes
			console.log('Reverting to virtual')
			this._lines = []
		}

		super.integrateFrom(node)
	}

	onFileContentChanged(text: string) {
		console.log(`${this.name} got new text`)
		if (!text) {
			console.log('  text was empty')
		}
		if (this._waitFlag) {
			window.clearTimeout(this._waitFlag)
			this._waitFlag = undefined
		}
		
		const result = parseMarkdown(text, {
			filepath: this.path,
			autoEmbedRawLinks: this.workspace.settings.rawLinksAutoEmbed.value,
			allowInterTextUnderscoreFormatting: this.workspace.settings.allowInterTextUnderscoreFormatting.value
		})
		if (result.awaiting?.length) {
			// If we're waiting on something for processing complete, delay
			this._waitFlag = window.setTimeout(() => {
				this.onFileContentChanged(text)
			}, 100)
			return
		}
		this._lines = result.lines
		this.notifyChanged()
	}

	onUnloaded() {
		this.lines = null
	}

	get isReady(): boolean {
		return super.isReady || this.meta?.virtual
	}
}
