import { describe, it, expect, beforeEach } from 'vitest'
import CreateNewFileCommand, { type CreateNewFileCommandContext } from './CreateNewFile'
import type { Workspace } from '..'
import IndexTreeStore from 'common/indexing/IndexTreeStore'
import { knownExtensions } from 'common/fileExtensions'
import type { TreeNode } from 'common/trees'

describe('Extension auto inclusion', () => {

	const directoryStore = new IndexTreeStore({
		files: {
			name: 'root',
			path: 'some/root',
			depth: 1,
			fileType: 'folder',
			children: []
		},
		tags: {
			path: '',
			name: '',
			names: [],
			fileType: ''
		}
	})

	// Expose the private function type-safely
	function resolveContext(context: CreateNewFileCommandContext, node?: TreeNode) {
		const workspace = {
			directoryStore,
			viewState: {
				directoryView: {
					selection: {
						value: []
					}
				},
				tangent: {
					getCurrentViewState() {
						return {
							node
						}
					},
				}
			}
		} as Workspace
	
		const command = new CreateNewFileCommand(workspace)
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
