import type MapNode from './MapNode'

interface MapNodePlacementOptions {
	horizontalSpacing: number
	verticalSpacing: number
}

function traverse(node: MapNode, set: Set<MapNode>) {
	set.add(node)
	for (const child of node.outgoing) {
		if (!set.has(child.to.value)) {
			traverse(child.to.value, set)
		}
	}
}

const verboseLog = false

export function placeMapNodes(nodes: MapNode[], options: MapNodePlacementOptions) {
	if (!nodes || !nodes.length) return

	// Gather the sizes for all nodes
	for (const node of nodes) {
		if (node.requestDimensions) {
			const dimensions = node.requestDimensions()
			if (dimensions) {
				node.setDimensions(dimensions.width, dimensions.height)
			}
		}		
	}

	let roots = nodes.filter(n => n.incoming.length == 0)

	if (verboseLog) console.log('starting with roots:', roots.map(n => n.node.value?.name))

	// Confirm that the roots can reach every node
	let allNodes = new Set<MapNode>()
	for (const root of roots) {
		traverse(root, allNodes)
	}

	// Add back nodes one at a time
	while (allNodes.size < nodes.length) {
		const nextNode = nodes.find(n => !allNodes.has(n))
		if (verboseLog) console.log('adding back', nextNode.node.value?.name)
		roots.push(nextNode)
		traverse(nextNode, allNodes)
	}

	// Sort roots
	roots.sort((a, b) => {

		const dateA = a.dateCreated?.valueOf() ?? 0
		const dateB = b.dateCreated?.valueOf() ?? 0

		if (dateA !== dateB) {
			return dateA - dateB
		}

		return nodes.indexOf(a) - nodes.indexOf(b)
	})

	// Reset the position details
	for (const node of nodes) {
		node.positionDetails = {
			effectiveHeight: 0,
			nextX: 0,
			groupY: 0,
			depth: 0,
			descendents: new Set(),
			verticalClaim: null,
			dateMode: 'none'
		}
	}

	// Breadth-first pass to make vertical claims
	let waiting = roots.slice()
	for (let i = 0; i < waiting.length; i++) {
		const parent = waiting[i]
		for (const connection of parent.outgoing) {
			const child = connection.to.value
			if (child.positionDetails.verticalClaim === null) {
				if (verboseLog) console.log(parent.node.value?.name, 'claims', child.node.value?.name)
				child.positionDetails.verticalClaim = parent
				waiting.push(child)
			}
		}
	}

	let currentPosition = options.verticalSpacing

	// Position all nodes
	let lastRoot: MapNode = null
	for (const root of roots) {
		root.isRoot.set(true)
		depthPass(root, options, [])

		if (!lastRoot) {
			root.positionDetails.dateMode = 'full'
		}
		else {
			const thisDate = root.dateCreated
			const lastDate = lastRoot.dateCreated
			
			if (thisDate.getDate() !== lastDate.getDate()) {
				root.positionDetails.dateMode = 'full'
			}
			else if (thisDate.getHours() !== lastDate.getHours()
				|| thisDate.getMinutes() !== lastDate.getMinutes()) {
				root.positionDetails.dateMode = 'time'
			}
		}
		
		root.positionDetails.nextX = options.horizontalSpacing
		root.positionDetails.groupY = currentPosition
		root.y = currentPosition + (root.positionDetails.effectiveHeight / 2) - (root.height / 2)
		if (verboseLog) console.log('root', root.node.value?.name, root.x, root.y)

		placeChildren(root, options)

		currentPosition += root.positionDetails.effectiveHeight + options.verticalSpacing
		lastRoot = root
	}

	// Apply x values
	for (const node of nodes) {
		node.x = node.positionDetails.nextX

		if (verboseLog) {
			console.group(node.node.value?.name, 'contains')
			for (const descendent of node.positionDetails.descendents) {
				console.log(descendent.node.value?.name)
			}
			console.groupEnd()
		}
	}
}

function depthPass(parent: MapNode, options: MapNodePlacementOptions, stack: MapNode[]) {
	if (verboseLog) console.group('depth pass for:', parent.node.value?.name)
	let height = 0
	let involvedNodes = 0

	const parentDetails = parent.positionDetails
	parentDetails.depth = stack.length
	if (verboseLog) console.log('stack', stack.map(n => n.node.value?.name))

	for (const connection of parent.outgoing) {
		const child = connection.to.value
		if (!stack.includes(child) && !child.positionDetails.descendents.has(parent)) {
			for (const superParent of stack) {
				superParent.positionDetails.descendents.add(child)
			}
			parentDetails.descendents.add(child)

			depthPass(child, options, [...stack, parent])
		}

		if (child.positionDetails.verticalClaim === parent) {
			involvedNodes++
			height += child.positionDetails.effectiveHeight
		}
	}
	
	height += (involvedNodes - 1) * options.verticalSpacing
	
	parentDetails.effectiveHeight = Math.max(height, parent.height)

	if (verboseLog) {
		console.log('height', parentDetails.effectiveHeight)
		console.log('contains', [...parentDetails.descendents].map(n => n.node.value?.name))
		console.groupEnd()
	}
}

function placeChildren(parent: MapNode, options: MapNodePlacementOptions) {
	const parentDetails = parent.positionDetails
	let x = parentDetails.nextX + parent.width + options.horizontalSpacing
	let y = parentDetails.groupY

	for (const connection of parent.outgoing) {
		const child = connection.to.value
		const childDetails = child.positionDetails

		if (childDetails.verticalClaim === parent) {
			childDetails.groupY = y
			child.y = y + (childDetails.effectiveHeight / 2) - (child.height / 2)
			y += options.verticalSpacing + childDetails.effectiveHeight
		}

		if (parentDetails.descendents.has(child)) {
			childDetails.nextX = Math.max(x, childDetails.nextX)
			placeChildren(child, options)
		}

		if (verboseLog) console.log(parent.node.value?.name, child.node.value?.name, child.x, child.y)
	}
}
