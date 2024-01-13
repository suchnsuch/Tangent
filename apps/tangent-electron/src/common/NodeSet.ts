import type { Readable } from 'svelte/store'
import type { TreeNodeOrReference } from './nodeReferences'
import type { CreationRuleOrDefinition } from './settings/CreationRule'

export default interface NodeSet {
	nodes: Readable<TreeNodeOrReference[]>
	creationRules: Readable<CreationRuleOrDefinition[]>
}