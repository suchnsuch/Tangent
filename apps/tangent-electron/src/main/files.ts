import fs from 'fs'
import path from 'path'

import type { TreeNode } from 'common/trees'

/**
 * Reads TreeNodes from a path, including any children
 * @param filepath 		The path to parse.
 * @param nodeBuilder 	(Optional) Is passed a raw TreeNode for transformation or replacement
 * @returns The root tree node, or null if there was no file
 */
export async function loadTreeFromPath(
	filepath: string,
	nodeBuilder?: (node: TreeNode) => Promise<TreeNode>)
	: Promise<TreeNode>
{
	let stats: fs.Stats = null
	try {
		stats = await fs.promises.stat(filepath)
	}
	catch (err) {
		// Could not read the filepath, it probably doesn't exist
		return null
	}
	
	let item: Partial<TreeNode> = {
		name: path.basename(filepath),
		path: filepath,
		created: stats.birthtime,
		modified: stats.mtime
	}

	if (stats.isDirectory()) {
		item.fileType = 'folder'

		let files = await fs.promises.readdir(filepath)

		item.children = await Promise.all(files.map(async file => {
			let childPath = path.join(filepath, file)
			return loadTreeFromPath(childPath, nodeBuilder)
		}))
	}
	else if (stats.isFile()) {
		let extension = path.extname(item.path)
		item.name = path.basename(item.path, extension)
		item.fileType = extension
	}

	if (nodeBuilder) {
		item = await nodeBuilder(item as TreeNode)
	}

	return item as TreeNode
}
