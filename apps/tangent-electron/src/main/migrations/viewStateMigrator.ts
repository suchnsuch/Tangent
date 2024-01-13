import Workspace from 'main/Workspace'

export const latestViewStateVersion = 2

export default function migrate(workspace: Workspace, viewstate: any) {
	let version = viewstate.version ?? 0

	if (version === 0) {
		// The tangent map was updated
		const mapNodes = viewstate?.tangent?.mapNodes
		if (mapNodes) {
			delete viewstate.tangent.mapNodes

			const map = {} as any

			map.nodes = {}
			map.connections = []

			for (const path in mapNodes) {
				const node = mapNodes[path]
				node.strength = 1

				const outgoing = node.outgoing

				delete node.incoming
				delete node.outgoing

				map.nodes[path] = node

				for (const item of outgoing) {
					map.connections.push({
						from: path,
						to: item,
						strength: 1
					})
				}
			}

			viewstate.tangent.map = map
		}

		viewstate.version = version = 1
	}

	if (version === 1) {
		// This migration should have occured with the rest of the workspace migrations, but did not.
		// Need to update the DirectoryView data to use portable paths.
		// Needs to pre-dectect portable paths, as versioning was not updated.

		function pathToPortablePath(path) {
			if (!workspace.contentsStore.isPortablePath(path)) {
				return workspace.contentsStore.pathToPortablePath(path)
			}
			return path
		}

		function pathsToPortablePaths(paths) {
			if (!Array.isArray(paths)) return
				
			for (let i = 0; i < paths.length; i++) {
				const value = paths[i]
				if (typeof value !== 'string') {
					paths.splice(i, 1)
					i--
					continue
				}

				paths[i] = pathToPortablePath(value)
			}
		}

		function updateDirectoryView(view) {
			pathsToPortablePaths(view?.openDirectories)
			pathsToPortablePaths(view?.selection)
		}

		updateDirectoryView(viewstate?.directoryView)
		updateDirectoryView(viewstate?.tagTreeView)

		viewstate.version = version = 2
	}
}