import { ObjectStore, type ObjectStoreOptions, WritableStore, ValidatingStore, rawOrStoreValue } from 'common/stores'
import Setting, { type SettingDefinition } from './Setting'


export const commandTemplates = [
	{
		text: '%cursor%',
		description: 'Cursor position in note. Line,Col'
	},
	{
		text: '%workspace%',
		description: 'Current workspace path.'
	},
	{
		text: '%file%',
		description: 'Current file path.'
	},
	// TODO {
	// 	text: '%thread%',
	// 	description: 'All files path in current thread view.'
	// },
]

export type ExternalCommandOrDefinition = ExternalCommand | ExternalCommandDefinition


export interface ExternalCommandDefinition {
	name: string
	commandTemplate: string
	description: string
}

export function nameFromCommand(command: ExternalCommand | ExternalCommandDefinition, name?: string): string {
	return (typeof command.name == 'string' ?  command.name : command.name.value) || name
}

export function willPromptForName(name: string) {
	return !!name.trim()
}

const commandNameDefinition: SettingDefinition<string> = {
	name: 'Name',
	description: 'The command\'s display name. Used for identification and search functionality.',
	defaultValue: '',
	form: 'default'
}

const commandTemplateDefinition: SettingDefinition<string> = {
	name: 'Command Template',
	description: 'The text template that generates the CLI command to execute.',
	defaultValue: '',
	form: 'textarea'
}

const shortcutDefinition: SettingDefinition<string> = {
	name: 'Shortcut',
	description: 'If set, this shortcut will invoke this command.',
	defaultValue: '',
	form: 'shortcut'
}

const descriptionDefinition: SettingDefinition<string> = {
	name: 'Description',
	description: 'An overview of the command so that you don\'t forget.',
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

export default class ExternalCommand extends ObjectStore {
	id: number

	name: Setting<string>
	commandTemplate: Setting<string>
	shortcut: Setting<string>
	description: Setting<string>

	constructor(initialPatch?: any) {
		super(creationStoreOptions)

		this.id = externalCommandID++

		this.name = new Setting(commandNameDefinition)
		this.commandTemplate = new Setting(commandTemplateDefinition)
		this.description = new Setting(descriptionDefinition)
		this.shortcut = new Setting(shortcutDefinition)

		if (initialPatch) this.applyPatch(initialPatch)
		this.setupObservables()
	}

	getDefinition() {
		return this.getRawValues() as ExternalCommandDefinition
	}
}
