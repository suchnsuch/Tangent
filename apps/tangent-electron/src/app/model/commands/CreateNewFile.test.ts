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
	let currentNode: TreeNode
	// `unknown` first: the stub only implements the members these tests reach
	const workspace = {
		directoryStore,
		viewState: {
			modal: { push: () => effects.modal++ },
			tangent: { getCurrentViewState: () => ({ node: currentNode }) },
			directoryView: {
				selection: {
					value: [] as TreeNode[]
				}
			}
		}
	} as unknown as Workspace

	const command = new CreateNewFileCommand(workspace)
	// Expose the private function type-safely
	function resolveContext(context: CreateNewFileCommandContext, node?: TreeNode) {
		currentNode = node
		return (command as any).resolveContext(context)
	}

	beforeEach(() => {
		currentNode = undefined
		workspace.viewState.directoryView.selection.value = []
		effects.modal = 0
	})

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
		expect(command.getTooltip()).toBe('Creates a new note in "Ideas/研究".')
	})

	it('Does not claim invalid destinations from reserved or invalid inputs', () => {
		workspace.viewState.directoryView.selection.value = [{
			name: 'private', path: 'some/root/.tangent/private', depth: 3, fileType: 'folder'
		}]
		expect(command.getTooltip()).toBe('Creates a new note in the root of the workspace.')
		expect(command.getTooltip({ relativePath: 'CON/New Note.md' })).toBe('Creates a new note.')
	})

	it('Ends custom descriptions with one period when a destination is invalid', () => {
		for (const description of ['A custom journal description', 'A custom journal description.']) {
			expect(command.getTooltip({ rule: {
				name: 'Journal', nameTemplate: 'Daily', folder: 'CON', contentTemplate: '',
				mode: 'create', description
			} })).toBe('A custom journal description.')
		}
	})

	it('Updates the destination for path and explicit-folder contexts', () => {
		workspace.viewState.directoryView.selection.value = [unicodeFolder]
		expect(command.getTooltip({ relativePath: 'Projects/Long Term/New Note.md' }))
			.toBe('Creates a new note in "Projects/Long Term".')
		expect(command.getTooltip({ folder: ideasFolder }))
			.toBe('Creates a new note in "Ideas".')
	})

	it('Includes folders in raw palette names in the destination', () => {
		const context = { name: 'Projects/Long Term' }
		expect(command.getTooltip(context)).toBe('Creates a new note in "Projects".')
		workspace.viewState.directoryView.selection.value = [ideasFolder]
		expect(command.getTooltip(context)).toBe('Creates a new note in "Ideas/Projects".')
		expect(command.getTooltip({ name: 'CON/New Note' })).toBe('Creates a new note.')
		expect(context).toEqual({ name: 'Projects/Long Term' })
		expect(effects.modal).toBe(0)
	})

	it('Names the rule when it has no description of its own', () => {
		workspace.viewState.directoryView.selection.value = []
		expect(command.getTooltip({
			rule: {
				name: 'Journal', nameTemplate: 'Daily', folder: 'Journal', contentTemplate: '',
				mode: 'create', description: ''
			}
		})).toBe('Creates a new Journal in "Journal".')
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
		expect(tooltip).toBe('A custom journal description\nDestination: "Ideas".')
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
		expect(command.getTooltip({ rule })).toBe('Creates a new Meeting in "Notes/Meetings".')
		expect(effects).toEqual(beforeEffects)

		// The same rule through the interactive path still asks for the name
		resolveContext({ rule })
		expect(effects.modal).toBe(beforeEffects.modal + 1)
	})

	it('Names the folder the template fixes when the typed name adds more', () => {
		workspace.viewState.directoryView.selection.value = []
		const beforeEffects = { ...effects }
		// "%name%/Entry" puts the file in Notes/<typed name>, so "Notes" is the
		// deepest folder that is known before the name is typed
		expect(command.getTooltip({
			rule: {
				name: 'Entry', nameTemplate: '%name%/Entry', folder: 'Notes',
				contentTemplate: '', mode: 'create', description: ''
			}
		})).toBe('Creates a new Entry in "Notes".')
		// The segments before the token are still fixed and are still named
		expect(command.getTooltip({
			rule: {
				name: 'Entry', nameTemplate: 'Archive/%name%/Entry', folder: 'Notes',
				contentTemplate: '', mode: 'create', description: ''
			}
		})).toBe('Creates a new Entry in "Notes/Archive".')
		expect(effects).toEqual(beforeEffects)
	})

	it('Describes relative rule folders against the current note without prompting', () => {
		currentNode = {
			name: 'note', path: 'some/root/Ideas/note.md', fileType: 'note', depth: 3
		}
		const rule: CreationRuleDefinition = {
			name: 'Meeting', nameTemplate: '%name%', folder: './',
			contentTemplate: '', mode: 'create', description: ''
		}
		expect(command.getTooltip({ rule })).toBe('Creates a new Meeting in "Ideas".')
		expect(command.getTooltip({ rule: { ...rule, folder: '../' } }))
			.toBe('Creates a new Meeting in the root of the workspace.')
		expect(effects.modal).toBe(0)
	})

	it('Skips a selected file whose parent no longer exists during tooltip resolution', () => {
		workspace.viewState.directoryView.selection.value = [{
			name: 'removed', path: 'some/root/Gone/removed.md', fileType: 'note', depth: 3
		}]
		expect(command.getTooltip()).toBe('Creates a new note in the root of the workspace.')
		expect(effects.modal).toBe(0)
	})

	it('Resolves paths adjacent to a note', () => {
		expect(resolveContext({
			rule: {
				name: 'relative test',
				nameTemplate: 'temp',
				folder: './',
				mode: 'createOrOpen',
				contentTemplate: undefined,
				description: undefined
			},
			extension: 'default-md'
		}, {
				path: '/some/root/note.md',
				name: 'test note',
				fileType: 'note',
		},
		)).toEqual({
			folderPath: 'some/root',
			contentTemplateFile: undefined,
			name: 'temp',
			extension: '.md',
			creationMode: 'createOrOpen'
		})
	})

	it('Resolves paths adjacent to a note name template', () => {
		expect(resolveContext({
			rule: {
				name: 'relative test',
				nameTemplate: '../assets/idea',
				folder: '../',
				mode: 'createOrOpen',
				contentTemplate: undefined,
				description: undefined
			},
			extension: 'default-md'
		}, {
				path: '/path/to/dir/note/idea.md',
				name: 'test note',
				fileType: 'note',
		},
		)).toEqual({
			folderPath: 'path/to/assets',
			contentTemplateFile: undefined,
			name: 'idea',
			extension: '.md',
			creationMode: 'createOrOpen'
		})
	})

	it('Resolves parent path from a note', () => {
		expect(resolveContext({
			rule: {
				name: 'relative test',
				nameTemplate: 'temp',
				folder: '../',
				mode: 'createOrOpen',
				contentTemplate: undefined,
				description: undefined
			},
			extension: 'default-md'
		}, {
				path: '/some/root/note.md',
				name: 'test note',
				fileType: 'note',
		},
		)).toEqual({
			folderPath: 'some',
			contentTemplateFile: undefined,
			name: 'temp',
			extension: '.md',
			creationMode: 'createOrOpen'
		})
	})

	it('Resolves uncle path from a note', () => {
		expect(resolveContext({
			rule: {
				name: 'relative test',
				nameTemplate: 'temp',
				folder: '../test',
				mode: 'createOrOpen',
				contentTemplate: undefined,
				description: undefined
			},
			extension: 'default-md'
		}, {
				path: '/some/root/note.md',
				name: 'test note',
				fileType: 'note',
		},
		)).toEqual({
			folderPath: 'some/test',
			contentTemplateFile: undefined,
			name: 'temp',
			extension: '.md',
			creationMode: 'createOrOpen'
		})
	})

	it('Resolves arbitrary ancestor paths relative to a note', () => {
		expect(resolveContext({
			rule: {
				name: 'relative test',
				nameTemplate: 'temp',
				folder: '../../../../../../test',
				mode: 'createOrOpen',
				contentTemplate: undefined,
				description: undefined
			},
			extension: 'default-md'
		}, {
				path: '/some/root/note.md',
				name: 'test note',
				fileType: 'note',
		},
		)).toEqual({
			folderPath: 'test',
			contentTemplateFile: undefined,
			name: 'temp',
			extension: '.md',
			creationMode: 'createOrOpen'
		})
	})

	it('Resolves paths adjacent to a directory', () => {
		expect(resolveContext({
			rule: {
				name: 'relative test',
				nameTemplate: 'temp',
				folder: './',
				mode: 'createOrOpen',
				contentTemplate: undefined,
				description: undefined
			},
			extension: 'default-md'
		}, {
				path: '/some/root',
				name: 'test note',
				fileType: 'folder',
		},
		)).toEqual({
			folderPath: 'some/root',
			contentTemplateFile: undefined,
			name: 'temp',
			extension: '.md',
			creationMode: 'createOrOpen'
		})
	})

	it('Resolves paths at root', () => {
		expect(resolveContext({
			rule: {
				name: 'absolute test',
				nameTemplate: 'temp',
				folder: './',
				mode: 'createOrOpen',
				contentTemplate: undefined,
				description: undefined
			},
			extension: 'default-md'
		},
		)).toEqual({
			folderPath: '.',
			contentTemplateFile: undefined,
			name: 'temp',
			extension: '.md',
			creationMode: 'createOrOpen'
		})
	})

})
