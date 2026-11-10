import fs from 'fs'
import path from 'path'

import Logger from 'js-logger'
import type { TreeNode } from 'common/trees'
import { filterInPlace } from 'common/utils'

const log = Logger.get('workspace.io')

/**
 * Determines whether a path should be included when loading a tree.
 * @param filepath	The absolute path being considered.
 * @param stats		The stats of the path.
 * @returns `true` if the path (and, for folders, its children) should be included.
 */
export type PathPredicate = (filepath: string, stats: fs.Stats) => boolean

/**
 * Reads TreeNodes from a path, including any children
 * @param filepath 		The path to parse.
 * @param predicate 	(Optional) Filters which paths are included. Excluded folders are not traversed.
 * @returns The root tree node, or null if there was no file or the path was excluded
 */
export async function loadTreeFromPath(
	filepath: string,
	predicate?: PathPredicate
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

	if (predicate && !predicate(filepath, stats)) {
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
			return loadTreeFromPath(childPath, predicate)
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
