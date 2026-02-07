import { type TreeNode, validatePath } from 'common/trees'
import { rawOrStoreValue } from 'common/stores'
import paths from 'common/paths'
import type Workspace from '../Workspace'
import File from '../File'
import WorkspaceCommand, { type PaletteAction } from './WorkspaceCommand'
import type { CommandContext } from './Command'
import CreateFileDialog from '../../modal/CreateFileDialog.svelte'
import CreationRule, { type CreationMode, type CreationRuleDefinition, nameFromRule, willPromptForName } from 'common/settings/CreationRule'
import type { NavigationData } from 'app/events'
import { isModKey } from 'app/utils/events'
import { knownExtensionsMatch } from 'common/fileExtensions'
import NoteFile from '../NoteFile'
import { fillDateFormat } from 'common/dates'

type CreationRuleOrDefinition = CreationRule | CreationRuleDefinition

export interface CreateNewFileCommandContext extends CommandContext {
	rule?: CreationRuleDefinition | CreationRule
	name?: string
	/**
	 * The extension to be used for the name.
	 * - If `undefined`, ".md" will be used if no extension can be found.
	 * - If `false`, no extension will be applied.
	 * - If `"default-md"`, the ".md" extension will be added if any discovered extension is not in the known extension list.
	 */
	extension?: string | 'default-md' | false
	folder?: TreeNode
	path?: string
	relativePath?: string
	updateSelection?: boolean
	navigateFrom?: TreeNode
	creationMode?: CreationMode
}

type CreationValues = {
	folderPath: string
	name: string
	extension: string
	creationMode: CreationMode
	contentTemplateFile?: NoteFile
}

export default class CreateNewFileCommand extends WorkspaceCommand {

	constructor(workspace: Workspace) {
		super(workspace, { shortcut: 'Mod+N' })
	}

	getFolderForRule(rule: CreationRuleOrDefinition) {
		const folderName = rawOrStoreValue(rule.folder)
		const store = this.workspace.directoryStore
		if (folderName === '') {
			return store.files
		}
		return store.files.resolveRelativePath(folderName)
	}

	willOpenExistingFile(rule: CreationRuleOrDefinition) {
		if (rawOrStoreValue(rule.mode) !== 'createOrOpen') return false

		if (willPromptForName(rawOrStoreValue(rule.nameTemplate))) {
			// Don't know what the user will type, can't determine
			return false
		}

		const name = nameFromRule(rule)
		if (typeof name !== 'string') return false

		// If the folder doesn't exist, the rule will definitely create a new file
		const folder = this.getFolderForRule(rule)
		if (!folder) return false

		// TODO: This duplication feels gross, but this is an inherent sidepath anyways
		let newPath = paths.join(folder.path, name + '.md')
		const existingNode = this.workspace.directoryStore.get(newPath)
		return existingNode instanceof File
	}

	private resolveContext(context: CreateNewFileCommandContext): CreationValues {

		let { rule, path, relativePath, folder, name, extension, updateSelection, creationMode } = context || {}
		const { directoryStore, viewState } = this.workspace

		updateSelection = updateSelection ?? true

		let contentTemplateFile: NoteFile = undefined

		if (rule instanceof CreationRule) {
			rule = rule.getDefinition()
		}

		let folderPath = folder ? directoryStore.pathToRelativePath(folder.path) : false

		if (rule) {
			if (!name) {
				const nameResult = nameFromRule(rule)
				if (typeof nameResult === 'string') {
					name = nameResult
				}
				else if (nameResult !== null) {
					const { preName, postName } = nameResult

					this.workspace.viewState.modal.push(CreateFileDialog, {
						title: 'Create New ' + rule.name,
						preName,
						postName,
						context
					})
					// The dialog will handle the rest
					return
				}
				else {
					// Fall back to the default naming flow
					name = 'New Note'
				}
			}

			// Combining into a relative path allows rule name templates to define folders
			relativePath = paths.join(folderPath || rule.folder, name + '.md')

			if (rule.contentTemplate) {
				const path = paths.join(this.workspace.directoryStore.files.path, rule.contentTemplate)
				const result = this.workspace.directoryStore.get(path)
				if (result instanceof NoteFile) {
					contentTemplateFile = result
				}
			}
		}

		if (path && !relativePath) {
			const theRelativePath = directoryStore.pathToRelativePath(path)
			if (theRelativePath !== false) {
				relativePath = theRelativePath
			}
		}

		if (relativePath) {
			const validatedPath = validatePath(relativePath)
			if (!validatedPath) {
				throw new Error(`Could not create file. "${relativePath}" is invalid and could not be made valid.`)
			}
			relativePath = validatedPath

			// Split the relative path elements back into their component parts
			folderPath = paths.dirname(relativePath)
			const derivedExtension = paths.extname(relativePath)

			if (extension === 'default-md' && !derivedExtension.match(knownExtensionsMatch)) {
				// The derived extension was not recognized, so we're going to prefer .md
				name = paths.basename(relativePath)
				extension = '.md'
			}
			else {
				name = paths.basename(relativePath, derivedExtension)
				extension = derivedExtension
			}
		}

		// Last ditch attempts to determine critical elements
		if (folderPath === false) {
			// Determine the folder from the UI state
			let selection = viewState.directoryView.selection.value
			let deepestFolder: TreeNode = null
			for (let item of selection) {
				if (item.path.includes('.tangent')) {
					// Ignore files within the reserved directory
					continue
				}

				// When looking at a folder, create items within the folder
				let folder = item.fileType === 'folder' ? item : directoryStore.getParent(item)

				if (!deepestFolder || deepestFolder.depth > folder.depth) {
					deepestFolder = folder
				}
			}

			if (!deepestFolder) {
				deepestFolder = directoryStore.files
			}

			folderPath = directoryStore.pathToRelativePath(deepestFolder.path)
			if (folderPath === false) {
				throw new Error('A relative folder path could not be determined! This should not happen by this point.')
			}
		}

		if (!name) {
			name = 'New Note'
		}

		if (extension === false) {
			// ensure there is no extension
			extension = '' 
		}
		else {
			// use || to handle empty string
			extension = extension || '.md'
		}

		return {
			folderPath,
			name,
			extension,
			creationMode: creationMode || rule?.mode,
			contentTemplateFile
		}
	}

	private createNode(values: CreationValues) {
		const { directoryStore } = this.workspace
		let { folderPath, name, extension, creationMode, contentTemplateFile } = values
		// Make the thing!

		// The "name" might contain path information
		const newRelativePath = paths.join(folderPath, name + extension)
		const validatedPath = validatePath(newRelativePath)
		if (!validatedPath) {
			throw new Error(`Could not create file. "${name}" is invalid and could not be made valid.`)
		}
		let newPath = paths.join(directoryStore.files.path, validatedPath)

		// Extract the folder & name from the newly created path
		folderPath = paths.dirname(newPath)
		name = paths.basename(newPath, extension)

		const existingNode = directoryStore.get(newPath, creationMode === 'createOrOpenCaseInsensitive')
		if (creationMode && creationMode.startsWith('createOrOpen')) {
			if (existingNode instanceof File) {
				return existingNode
			}
		}

		// Virtual files are told to be created
		if (!existingNode?.meta?.virtual) {
			let counter = 0
			while (directoryStore.has(newPath)) {
				counter++
				newPath = paths.join(folderPath, `${name} ${counter}${extension}`)
			}
		}
		else {
			// Node will be recreated
			directoryStore.remove(existingNode)
		}

		// Override to the true extension
		extension = paths.extname(newPath)
		const newRawNode: TreeNode = {
			path: newPath,
			name: paths.basename(newPath, extension),
			fileType: extension
		}

		const { node, onComplete } = this.workspace.createTreeNode({ node: newRawNode, paired: true })
		if (node instanceof File) {
			node.loadState = 'new'

			if (onComplete && contentTemplateFile) {
				const getContent = this.workspace.api.file.getFileContents(contentTemplateFile.path)
				Promise.all([getContent, onComplete]).then(([template, _]) => {

					const now = new Date()
					let content = fillDateFormat(template, now)

					// TODO: This is _gross_, and should not be necessary.
					// `setFileContent()` should be the thing that does this.
					node.isDirty = true
					node.setFileContent(content)
					node.saveFile()
				})
			}
		}

		return node
	}

	canExecute(context?: CreateNewFileCommandContext): boolean {
		return true
	}

	canExecuteFromShortcut(shortcut: string, context?: CreateNewFileCommandContext): boolean {
		// Do shenanigans to check for other rules, modifying the context if necessary
		if (!super.canExecuteFromShortcut(shortcut, context) && !context?.rule) {
			for (const rule of this.workspace.workspaceSettings.value.creationRules.value) {
				if (rule.shortcut.value === shortcut) {
					if (context) context.rule = rule
					if (this.canExecute(context)) {
						return true
					}
				}
			}
			if (context) delete context.rule
			return false
		}
		return true
	}

	execute(context: CreateNewFileCommandContext): TreeNode {
		const debug = this.workspace.debug.fileCreation
		if (debug) console.log('Creating file', context)
		
		// Forward to createNode for easy post-creation handling here
		const values = this.resolveContext(context)
		if (!values) return
		let newNode = this.createNode(values) 
		if (newNode) {
			if (context?.updateSelection ?? true) {
				const { directoryStore, viewState } = this.workspace

				if (viewState.tangent.thread.value?.includes(newNode)) {
					// If we're already looking at it, just focus it
					viewState.tangent.activeSession.value.updateThread({
						currentNode: newNode,
						thread: 'retain'
					})
					return
				}

				const nav: NavigationData = {
					target: newNode
				}

				let navigateFrom = context?.navigateFrom
				const rule = context?.rule

				if (!navigateFrom && context?.initiatingEvent && isModKey(context.initiatingEvent as KeyboardEvent)) {
					// Note: the cast to `KeyboardEvent` does not matter; this works for clicks as well.
					navigateFrom = viewState.tangent.currentNode.value
				}

				const openInContext = rawOrStoreValue(rule?.openInContext)
				if (!navigateFrom && openInContext) {
					navigateFrom = directoryStore.files.resolveRelativePath(openInContext)
				}

				if (navigateFrom) {
					nav.origin = navigateFrom
				}

				this.workspace.navigateTo(nav)
			}
	
			return newNode
		}
	}

	getPaletteActions() {
		const actions: PaletteAction[] = [{
			name: 'Create New Note',
			command: this
		}]

		for (const rule of this.workspace.workspaceSettings.value.creationRules) {
			actions.push({
				name: 'Create ' + rule.name.value,
				command: this,
				context: {
					rule
				},
				shortcuts: rule.shortcut.value ? [rule.shortcut.value] : null
			})
		}

		return actions
	}

	getLabel(context: CreateNewFileCommandContext) {
		const rule = context?.rule
		if (rule) {
			return 'Create ' + rawOrStoreValue(rule.name)
		}
		// TODO: Support all possible arguments
		return 'Create New Note'
	}

	getTooltip(context: CreateNewFileCommandContext) {
		const rule = context?.rule
		if (rule) {
			const description = rawOrStoreValue(rule.description)
			return description || 'Creates a new ' + rawOrStoreValue(rule.name)
		}
		return 'Creates a new note'
	}
}
