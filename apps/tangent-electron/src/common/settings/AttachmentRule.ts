import { ObjectStore, type ObjectStoreOptions, WritableStore, ValidatingStore, rawOrStoreValue } from 'common/stores'
import Setting, { type SettingDefinition } from './Setting'
import { isEmptyOrWhitespace } from 'common/stringUtils'

export type ResolveMode = 'default' | 'upward'

export type AttachmentRulesDefinition = AttachmentRule | AttachmentRuleDefinition

export interface AttachmentRuleDefinition {
	resolveMode: ResolveMode
	path: string
	description: string
}

export function nameFromRule(rule: AttachmentRule | AttachmentRuleDefinition, defaultValue: string): string {
	return (typeof rule.path == 'string' ? rule.path : rule.path.value) || defaultValue
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
			value: 'default',
			displayName: 'Default',
			description: 'absolute or relative path to the current note.'
		},
		{
			value: 'upward',
			displayName: 'Search in Anscestors',
			description: 'iteratively looks in the parent folder for the path.'
		}
	],
	defaultValue: 'default'
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

	path: Setting<string>
	resolveMode: Setting<ResolveMode>
	description: Setting<string>

	constructor(initialPatch?: any) {
		super(creationStoreOptions)

		this.id = AttachmentRuleID++
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
