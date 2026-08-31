import { describe, it, expect, beforeEach } from 'vitest'
import CreateNewFileCommand, { type CreateNewFileCommandContext } from './CreateNewFile'
import type { Workspace } from '..'
import IndexTreeStore from 'common/indexing/IndexTreeStore'
import { knownExtensions } from 'common/fileExtensions'
import type { TreeNode } from 'common/trees'

describe('Extension auto inclusion', () => {

	const unicodeFolder: TreeNode = {
		name: '研究',
		path: 'some/root/Ideas/研究',
		depth: 3,
		fileType: 'folder',
		children: []
	}
	const ideasFolder: TreeNode = {
		name: 'Ideas',
		path: 'some/root/Ideas',
		depth: 2,
		fileType: 'folder',
		children: [unicodeFolder]
	}
	const directoryStore = new IndexTreeStore({
		files: {
			name: 'root',
			path: 'some/root',
			depth: 1,
			fileType: 'folder',
			children: [ideasFolder]
		},
		tags: {
			path: '',
			name: '',
			names: [],
			fileType: ''
		}
	})
	const effects = { navigation: 0, modal: 0 }

	const workspace: Workspace = Object.assign(Object.create(null), {
		directoryStore,
		navigateTo: () => effects.navigation++,
		viewState: {
			modal: { push: () => effects.modal++ },
			directoryView: {
				selection: {
					value: []
				}
			}
		}
	})

	const command = new CreateNewFileCommand(workspace)
	// Expose the private function type-safely
	function resolveContext(context: CreateNewFileCommandContext) {
		return (command as any).resolveContext(context)
	}

	it('Injects .md when nothing is applied', () => {
		expect(resolveContext({
			name: 'Some Note'
		})).toEqual({
			folderPath: '',
			name: 'Some Note',
			extension: '.md',
			creationMode: undefined
		})
	})

	it('Uses the provided extension when specified', () => {
		expect(resolveContext({
			name: 'test',
			extension: '.flower'
		})).toEqual({
			folderPath: '',
			name: 'test',
			extension: '.flower',
			creationMode: undefined
		})
	})

	it('Does not include an extension when requested', () => {
		expect(resolveContext({
			name: '.foo',
			extension: false
		})).toEqual({
			folderPath: '',
			name: '.foo',
			extension: '',
			creationMode: undefined
		})
	})

	it('Does not inject .md onto a relative path when the extension is known', () => {
		for (const extension of knownExtensions) {
			expect(resolveContext({
				relativePath: 'test-name' + extension,
			})).toEqual({
				folderPath: '.',
				name: 'test-name',
				extension,
				creationMode: undefined
			})
		}
	})

	it('Discovers an extension when not defined', () => {
		expect(resolveContext({
			relativePath: '2010.08.10',
		})).toEqual({
			folderPath: '.',
			name: '2010.08',
			extension: '.10',
			creationMode: undefined
		})
	})

	it('Injects .md onto a relative path when the extension is not known', () => {
		expect(resolveContext({
			relativePath: '2010.08.10',
			extension: 'default-md'
		})).toEqual({
			folderPath: '.',
			name: '2010.08.10',
			extension: '.md',
			creationMode: undefined
		})
	})

	it('Describes the default, selected, nested, and Unicode destinations', () => {
		const selection = workspace.viewState.directoryView.selection
		selection.value = []
		expect(command.getTooltip()).toContain('Destination: Workspace Root')

		selection.value = [unicodeFolder]
		expect(command.getTooltip()).toContain('Destination: Ideas/研究')
	})

	it('Does not claim invalid destinations from reserved or invalid inputs', () => {
		workspace.viewState.directoryView.selection.value = [{
			name: 'private', path: 'some/root/.tangent/private', depth: 3, fileType: 'folder'
		}]
		expect(command.getTooltip()).toContain('Destination: Workspace Root')
		expect(command.getTooltip({ relativePath: 'CON/New Note.md' })).toBe('Creates a new note')
	})

	it('Updates the destination for path and explicit-folder contexts', () => {
		workspace.viewState.directoryView.selection.value = [unicodeFolder]
		expect(command.getTooltip({ relativePath: 'Projects/Long Term/New Note.md' }))
			.toContain('Destination: Projects/Long Term')
		expect(command.getTooltip({ folder: ideasFolder }))
			.toContain('Destination: Ideas')
	})

	it('Preserves rule descriptions and resolves rule destination precedence', () => {
		const context: CreateNewFileCommandContext = {
			folder: ideasFolder,
			path: 'some/root/Other/New Note.md',
			rule: {
				name: 'Journal', nameTemplate: 'Daily', folder: 'Journal', contentTemplate: '',
				mode: 'create', description: 'A custom journal description'
			}
		}
		const before = structuredClone(context)
		const beforeSelection = workspace.viewState.directoryView.selection.value
		const beforeEffects = { ...effects }
		const tooltip = command.getTooltip(context)
		expect(tooltip).toContain('A custom journal description')
		expect(tooltip).toContain('Destination: Ideas')
		expect(command.getTooltip(context)).toBe(tooltip)
		expect(context).toEqual(before)
		expect(workspace.viewState.directoryView.selection.value).toBe(beforeSelection)
		expect(effects).toEqual(beforeEffects)
	})
})
