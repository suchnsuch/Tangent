import { ObjectStore, ObjectStoreOptions, WritableStore, ValidatingStore, rawOrStoreValue } from 'common/stores'
import { fillDateFormat } from '../dates'
import Setting, { SettingDefinition } from './Setting'

export type CreationMode = 'create' | 'createOrOpen'

export type CreationRuleOrDefinition = CreationRule | CreationRuleDefinition

export interface CreationRuleDefinition {
	name: string
	nameTemplate: string
	folder: string
	mode: CreationMode
	description: string
	showInMenu?: boolean
	openInContext?: string
}

const nameToken = '%name%'

export type NamingResult = string | { preName: string, postName: string }
export function nameFromRule(rule: CreationRule | CreationRuleDefinition, name?: string): NamingResult {
	let result = rawOrStoreValue(rule.nameTemplate)

	if (!result || result === nameToken) {
		if (name) return name
		return null
	}
	
	result = fillDateFormat(result, new Date())
	
	const nameIndex = result.indexOf(nameToken)
	if (nameIndex >= 0) {
		const preName = result.substring(0, nameIndex)
		const postName = result.substring(nameIndex + nameToken.length)
		if (name) {
			return preName + name + postName
		}
		else {
			return {
				preName, postName
			}
		}
	}

	return result
}

export function willPromptForName(template: string) {
	if (!template) return true
	return template.indexOf(nameToken) >= 0
}

const folderStoreDefinition: SettingDefinition<string> = {
	name: 'Target Folder',
	description: 'The folder in which the note will be created.',
	defaultValue: '',
	form: 'folder'
}

const creationModeDefinition: SettingDefinition<CreationMode> = {
	name: 'Creation Mode',
	description: 'Determines how the new note is created.',
	validValues: [
		{
			value: 'create',
			displayName: 'Create',
			description: 'A new note will always be created. If necessary, numbers will be appended to the name to make a unique name.'
		},
		{
			value: 'createOrOpen',
			displayName: 'Create or Open',
			description: 'If this rule would create a note that already exists, that note is opened instead.'
		}
	]
}

const descriptionDefinition: SettingDefinition<string> = {
	name: 'Description',
	description: 'An overview of the rule so that you don\'t forget.',
	defaultValue: '',
	form: 'textarea',
	placeholder: 'Add description...'
}

const showInMenuDefinition: SettingDefinition<boolean> = {
	name: 'Show In Menu',
	description: 'If checked, this rule will show up in the "Create New Note" pop-up button.',
	defaultValue: true
}

const openInContextDefinition: SettingDefinition<string> = {
	name: 'Open With',
	description: 'If set, new notes created by this rule will be opened in the context of the selected folder or note.',
	defaultValue: '',
	form: 'path',
	placeholder: 'Disabled'
}

// Used for differentiation in drag/drop
// TODO: Maybe these could be persistent? Maybe they can help with list sync?
let creationRuleID = 0

const creationStoreOptions: ObjectStoreOptions = {
	patchBlockList: ['id']
}

export default class CreationRule extends ObjectStore {
	id: number

	name: ValidatingStore<string>
	nameTemplate: WritableStore<string>

	folder: Setting<string>
	mode: Setting<CreationMode>

	description: Setting<string>
	showInMenu: Setting<boolean>

	openInContext: Setting<string>

	constructor(initialPatch?: any) {
		super(creationStoreOptions)

		this.id = creationRuleID++

		this.name = new ValidatingStore('New Creation Rule', name => {
			if (!name) return 'New Creation Rule'
			return name
		})
		this.nameTemplate = new WritableStore('%name%')
		this.folder = new Setting(folderStoreDefinition)
		this.mode = new Setting(creationModeDefinition)
		this.description = new Setting(descriptionDefinition)
		this.showInMenu = new Setting(showInMenuDefinition)
		this.openInContext = new Setting(openInContextDefinition)

		if (initialPatch) this.applyPatch(initialPatch)
		this.setupObservables()
	}

	getDefinition() {
		return this.getRawValues() as CreationRuleDefinition
	}
}
