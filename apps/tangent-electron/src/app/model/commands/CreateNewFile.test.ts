import { describe, it, expect, beforeEach } from 'vitest'
import CreateNewFileCommand, { type CreateNewFileCommandContext } from './CreateNewFile'
import type { Workspace } from '..'
import IndexTreeStore from 'common/indexing/IndexTreeStore'
import { knownExtensions } from 'common/fileExtensions'
import type { TreeNode } from 'common/trees'
import type { CreationRuleDefinition } from 'common/settings/CreationRule'

describe('Extension auto inclusion', () => {

	const directoryStore = new IndexTreeStore({
		files: {
			name: 'root',
			path: 'some/root',
			depth: 1,
			fileType: 'folder',
			children: [
				{
					name: 'Ideas',
					path: 'some/root/Ideas',
					depth: 2,
					fileType: 'folder',
					children: [
						{
							name: '研究',
							path: 'some/root/Ideas/研究',
							depth: 3,
							fileType: 'folder',
							children: []
						}
					]
				}
			]
		},
		tags: {
			path: '',
			name: '',
			names: [],
			fileType: ''
		}
	})
	const ideasFolder = directoryStore.files.children[0]
	const unicodeFolder = ideasFolder.children[0]

	// Counts the side effects a tooltip must never cause
	const effects = { modal: 0 }
	// `unknown` first: the stub only implements the members these tests reach
	const workspace = {
		directoryStore,
		viewState: {
			modal: { push: () => effects.modal++ },
			directoryView: {
				selection: {
					value: [] as TreeNode[]
				}
			}
		}
	} as unknown as Workspace

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
		expect(command.getTooltip()).toBe('Creates a new note in the root of the workspace.')

		selection.value = [unicodeFolder]
		expect(command.getTooltip()).toBe('Creates a new note in Ideas/研究.')
	})

	it('Does not claim invalid destinations from reserved or invalid inputs', () => {
		workspace.viewState.directoryView.selection.value = [{
			name: 'private', path: 'some/root/.tangent/private', depth: 3, fileType: 'folder'
		}]
		expect(command.getTooltip()).toBe('Creates a new note in the root of the workspace.')
		expect(command.getTooltip({ relativePath: 'CON/New Note.md' })).toBe('Creates a new note')
	})

	it('Updates the destination for path and explicit-folder contexts', () => {
		workspace.viewState.directoryView.selection.value = [unicodeFolder]
		expect(command.getTooltip({ relativePath: 'Projects/Long Term/New Note.md' }))
			.toBe('Creates a new note in Projects/Long Term.')
		expect(command.getTooltip({ folder: ideasFolder }))
			.toBe('Creates a new note in Ideas.')
	})

	it('Names the rule when it has no description of its own', () => {
		workspace.viewState.directoryView.selection.value = []
		expect(command.getTooltip({
			rule: {
				name: 'Journal', nameTemplate: 'Daily', folder: 'Journal', contentTemplate: '',
				mode: 'create', description: ''
			}
		})).toBe('Creates a new Journal in Journal.')
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

	it('Never prompts for a name while building a tooltip', () => {
		workspace.viewState.directoryView.selection.value = []
		const rule: CreationRuleDefinition = {
			name: 'Meeting', nameTemplate: 'Meetings/%name%', folder: 'Notes',
			contentTemplate: '', mode: 'create', description: ''
		}
		const beforeEffects = { ...effects }
		expect(command.getTooltip({ rule })).toBe('Creates a new Meeting in Notes/Meetings.')
		expect(effects).toEqual(beforeEffects)

		// The same rule through the interactive path still asks for the name
		resolveContext({ rule })
		expect(effects.modal).toBe(beforeEffects.modal + 1)
	})

	it('Claims no destination when the typed name would choose the folder', () => {
		workspace.viewState.directoryView.selection.value = []
		const beforeEffects = { ...effects }
		expect(command.getTooltip({
			rule: {
				name: 'Entry', nameTemplate: '%name%/Entry', folder: 'Notes',
				contentTemplate: '', mode: 'create', description: ''
			}
		})).toBe('Creates a new Entry')
		expect(effects).toEqual(beforeEffects)
	})
})
