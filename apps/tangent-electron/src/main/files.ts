import fs from 'fs'
import path from 'path'

import Logger from 'js-logger'
import type { TreeNode } from 'common/trees'
import { filterInPlace } from 'common/utils'

const log = Logger.get('workspace.io')

/**
 * Reads TreeNodes from a path, including any children
 * @param filepath 		The path to parse.
 * @param nodeBuilder 	(Optional) Is passed a raw TreeNode for transformation or replacement
 * @returns The root tree node, or null if there was no file
 */
export async function loadTreeFromPath(
	filepath: string,
) : Promise<TreeNode>
{
	let stats: fs.Stats = null
	try {
		stats = await fs.promises.stat(filepath)
	}
	catch (err) {
		log.error(`Could not read "${filepath}". It will not be indexed.`)
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
			return loadTreeFromPath(childPath)
		}))

		filterInPlace(item.children, node => node != null)
	}
	else if (stats.isFile()) {
		let extension = path.extname(item.path)
		item.name = path.basename(item.path, extension)
		item.fileType = extension
	}

	return item as TreeNode
}
