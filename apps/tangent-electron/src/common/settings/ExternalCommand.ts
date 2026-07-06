import { ObjectStore, type ObjectStoreOptions, WritableStore, ValidatingStore, rawOrStoreValue } from 'common/stores'
import Setting, { type SettingDefinition } from './Setting'

export type ExternalCommandRuleOrDefinition = ExternalCommandRule | ExternalCommandRuleDefinition

export interface ExternalCommandRuleDefinition {
	name: string
	commandTemplate: string
	description: string
}

export function nameFromRule(rule: ExternalCommandRule | ExternalCommandRuleDefinition, name?: string): string {
	return (typeof rule.name == 'string' ?  rule.name : rule.name.value) || name
}

export function willPromptForName(name: string) {
	return !!name.trim()
}

const commandTemplateDefinition: SettingDefinition<string> = {
	name: 'Command Template',
	description: 'The markdown template file that seeds the initial content of a file.',
	defaultValue: '',
	form: 'textarea'
}

const shortcutDefinition: SettingDefinition<string> = {
	name: 'Shortcut',
	description: 'If set, this shortcut will invoke this creation rule.',
	defaultValue: '',
	form: 'shortcut'
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
let externalCommandID = 0

const creationStoreOptions: ObjectStoreOptions = {
	patchBlockList: ['id']
}

export default class ExternalCommandRule extends ObjectStore {
	id: number

	name: ValidatingStore<string>
	commandTemplate: Setting<string>

	shortcut: Setting<string>

	description: Setting<string>

	constructor(initialPatch?: any) {
		super(creationStoreOptions)

		this.id = externalCommandID++

		this.name = new ValidatingStore('New Creation Rule', name => {
			if (!name) return 'New Creation Rule'
			return name
		})
		this.commandTemplate = new Setting(commandTemplateDefinition)
		this.description = new Setting(descriptionDefinition)
		this.shortcut = new Setting(shortcutDefinition)

		if (initialPatch) this.applyPatch(initialPatch)
		this.setupObservables()
	}

	getDefinition() {
		return this.getRawValues() as ExternalCommandRuleDefinition
	}
}
