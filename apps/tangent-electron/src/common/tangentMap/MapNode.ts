import { coerceToDate } from 'common/dates'
import type { TreeNode, DirectoryStore, DirectoryLookup } from 'common/trees'
import { Point } from 'common/geometry'
import { ObjectStore, RawValueMode, WritableStore } from 'common/stores'
import { TreeItemReference } from 'common/trees/treeReferences'
import { numberedStringSort } from 'common/sorting'
import type MapConnection from './MapConnection'
import { IndexData } from 'common/indexing/indexTypes'

let nextId = 0

interface PositioningDetails {
	effectiveHeight: number
	groupY: number
	nextX: number
	descendents: Set<MapNode>
	depth: number
	verticalClaim: MapNode
	dateMode: 'full' | 'time' | 'none'
}

export enum MapStrength {
	None = 0,
	Connected = 1,
	Navigated = 2,
	
	Full = 3 // 11
}

export function mapStrengthClass(strength: MapStrength) {
	switch (strength) {
		case MapStrength.None:
			return 'strength-none'
		case MapStrength.Connected:
			return 'strength-connected'
		case MapStrength.Navigated:
			return 'strength-navigated'
		case MapStrength.Full:
			return 'strength-connected strength-navigated strength-full'
		default:
			return ''
	}
}

export class MapStrengthStore extends WritableStore<MapStrength> {
	constructor(strength=MapStrength.None) {
		super(strength)
	}

	add(strength: MapStrength) {
		if ((this._value & strength) !== strength) {
			this.value |= strength
		}
	}
}

export default class MapNode extends ObjectStore {

	id: number
	dateCreated: Date
	node: TreeItemReference<TreeNode>
	isRoot: WritableStore<boolean>
	strength = new MapStrengthStore()

	x: number
	y: number

	height: number
	width: number

	incoming: MapConnection[] = []
	outgoing: MapConnection[] = []

	positionDetails: PositioningDetails

	requestDimensions?: () => { width: number, height: number }

	constructor(directory: DirectoryLookup, initialPatch?: any) {
		super()

		this.id = nextId++

		let date = coerceToDate(initialPatch?.dateCreated)
		
		this.dateCreated = date
		this.node = new TreeItemReference<TreeNode>(directory)
		this.isRoot = new WritableStore(false)

		this.x = 0
		this.y = 0
		this.height = 0
		this.width = 0

		this.applyPatch(initialPatch)

		this.setupObservables()
	}

	getRawValues(mode?: RawValueMode) {
		const change = super.getRawValues(mode)
		change.dateCreated = this.dateCreated;
		return change
	}

	domID() {
		return "MapNode_" + this.id
	}

	position() {
		return Point.make(this.x, this.y)
	}

	center() {
		return Point.make(
			this.x + this.width * .5,
			this.y + this.height * .5
		)
	}

	setDimensions(width: number, height: number) {
		this.width = width
		this.height = height
		this.notifyChanged()
	}

	getInLinks() {
		const links = this.node.value?.meta?.inLinks
		if (links) {
			const cache = new Map()

			const set = new Set<TreeNode>()
			for (const item of links) {
				const node = this.node.directory.get(item.from)
				if (node) {
					set.add(node)
				}
			}

			return [...set].sort((a, b) => numberedStringSort(a?.name, b?.name, cache))
		}
		return []
	}

	getOutLinks() {
		const metadata = this.node.value?.meta
		if (metadata)
		{
			const linkGenerator = IndexData.outgoingConnections(this.node.value.meta)
			if (linkGenerator) {
				const cache = new Map()

				const set = new Set<TreeNode>()
				for (const item of linkGenerator) {
					const node = this.node.directory.get(item.to)
					if (node) {
						set.add(node)
					}
				}

				return [...set].sort((a, b) => numberedStringSort(a?.name, b?.name, cache))
			}
		}
		else if (Array.isArray(this?.node.value.children))
		{
			return this.node.value.children.filter(i => {
				return !i.name.startsWith('.')
			});
		}
		return []
	}
}

export function collectDescendants(node: MapNode, set?: Set<MapNode>) {
	set = set ?? new Set()

	for (const connection of node.outgoing) {
		const to = connection.to.value
		if (!set.has(to)) {
			set.add(to)
			collectDescendants(to, set)
		}
	}

	return set
}
