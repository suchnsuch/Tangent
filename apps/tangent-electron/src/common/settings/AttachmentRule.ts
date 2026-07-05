import { ObjectStore, type ObjectStoreOptions, WritableStore, ValidatingStore, rawOrStoreValue } from 'common/stores'
import Setting, { type SettingDefinition } from './Setting'
import { isEmptyOrWhitespace } from 'common/stringUtils'

export type ResolveMode = 'absolute' | 'relative' | 'upward'

export type AttachmentRulesDefinition = AttachmentRule | AttachmentRuleDefinition

export interface AttachmentRuleDefinition {
	name: string
	resolveMode: ResolveMode
	path: string
	description: string
}

export function nameFromRule(rule: AttachmentRule | AttachmentRuleDefinition, defaultValue: string): string {
	return (typeof rule.name == 'string' ? rule.name : rule.name.value) || defaultValue
}

export function willPromptForName(name: string) {
	return isEmptyOrWhitespace(name)
}

const pathDefinition: SettingDefinition<string> = {
	name: 'path',
	description: 'the folder want your attachments paste in', 
	defaultValue: '',
	form: 'folder'
}

const attachmentModeDefinition: SettingDefinition<ResolveMode> = {
	name: 'Creation Mode',
	description: 'Determines how the new note is created.',
	validValues: [
		{
			value: 'absolute',
			displayName: 'Absolute',
			description: 'A new note will always be created. If necessary, numbers will be appended to the name to make a unique name.'
		},
		{
			value: 'relative',
			displayName: 'Relative',
			description: 'Search the folder relative to the note'
		},
		{
			value: 'upward',
			displayName: 'in ancesstors',
			description: 'iteratively looks in the parent folder for the path'
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

// Used for differentiation in drag/drop
// TODO: Maybe these could be persistent? Maybe they can help with list sync?
let AttachmentRuleID = 0

const creationStoreOptions: ObjectStoreOptions = {
	patchBlockList: ['id']
}

export default class AttachmentRule extends ObjectStore {
	id: number
	name: ValidatingStore<string>
	path: Setting<string>
	resolveMode: Setting<ResolveMode>
	description: Setting<string>

	constructor(initialPatch?: any) {
		super(creationStoreOptions)

		this.id = AttachmentRuleID++
		this.name = new ValidatingStore('New Attachment Rule', name => {
			if (!name) return 'New Attachment Rule'
			return name
		})
		this.path = new Setting(pathDefinition)
		this.resolveMode = new Setting(attachmentModeDefinition)
		this.description = new Setting(descriptionDefinition)

		if (initialPatch) this.applyPatch(initialPatch)
		this.setupObservables()
	}

	getDefinition() {
		return this.getRawValues() as AttachmentRuleDefinition
	}
}
