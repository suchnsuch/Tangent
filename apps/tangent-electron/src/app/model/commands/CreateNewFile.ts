import { TreeNode, validateFileSegment, validatePath } from 'common/trees'
import { rawOrStoreValue } from 'common/stores'
import paths from 'common/paths'
import type Workspace from '../Workspace'
import File from '../File'
import WorkspaceCommand, { PaletteAction } from './WorkspaceCommand'
import type { CommandContext } from './Command'
import CreateFileDialog from '../../modal/CreateFileDialog.svelte'
import CreationRule, { CreationMode, CreationRuleDefinition, nameFromRule, willPromptForName } from 'common/settings/CreationRule'
import type { NavigationData } from 'app/events'
import { isModKey } from 'app/utils/events'

type CreationRuleOrDefinition = CreationRule | CreationRuleDefinition

export interface CreateNewFileCommandContext extends CommandContext {
	rule?: CreationRuleDefinition | CreationRule
	name?: string
	extension?: string | false // Pass in false for no extension
	folder?: TreeNode
	path?: string
	relativePath?: string
	updateSelection?: boolean
	navigateFrom?: TreeNode
	creationMode?: CreationMode
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

	private createNode(context: CreateNewFileCommandContext) {
		let { rule, path, relativePath, folder, name, extension, updateSelection, creationMode } = context || {}
		const { directoryStore, viewState } = this.workspace

		updateSelection = updateSelection ?? true

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
			name = paths.basename(relativePath, derivedExtension)
			extension = extension ?? derivedExtension
		}

		// Last ditch attempts to determine critical elements
		if (!folderPath) {
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

		creationMode = creationMode || rule?.mode

		const existingNode = directoryStore.get(newPath)
		if (creationMode === 'createOrOpen') {
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

		const newNode = this.workspace.createTreeNode({ node: newRawNode })
		if (newNode instanceof File) {
			newNode.loadState = 'new'
		}

		return newNode
	}

	execute(context: CreateNewFileCommandContext): TreeNode {
		const debug = this.workspace.debug.fileCreation
		if (debug) console.log('Creating file', context)
		
		// Forward to createNode for easy post-creation handling here
		let newNode = this.createNode(context) 
		if (newNode) {
			if (context?.updateSelection ?? true) {
				const nav: NavigationData = {
					target: newNode
				}

				const { directoryStore, viewState } = this.workspace

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
				shortcuts: null
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
