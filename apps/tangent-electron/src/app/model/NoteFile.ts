import type { TreeNode } from 'common/trees'
import File from "./File"
import type { Line } from 'typewriter-editor'

import type Workspace from './Workspace'
import { parseMarkdown } from 'common/markdownModel'
import { areLineArraysOpTextEquivalent, typewriterToText } from 'common/typewriterUtils';
import paths from 'common/paths';

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

	getFileContent(): string {
		const lines = this._lines
		if (lines) {
			return typewriterToText(lines)
		}
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
			filepath: this.path
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
