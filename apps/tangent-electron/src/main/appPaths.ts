import path from 'path'

const mainRoot = import.meta.dirname

/** `__build`, where everything the build produces lives. */
export const buildRoot = path.resolve(mainRoot, '..')

/** The application root, which holds `static`, `defaults`, and `node_modules`. */
export const appRoot = path.resolve(mainRoot, '../..')

export const staticRoot = path.join(appRoot, 'static')
export const defaultsRoot = path.join(appRoot, 'defaults')
export const nodeModulesRoot = path.join(appRoot, 'node_modules')

/**
 * The node_modules of the surrounding monorepo. Dependencies get hoisted there
 * during development, so it is the fallback when a package is not in the
 * application's own node_modules.
 */
export const hoistedNodeModulesRoot = path.resolve(appRoot, '../../node_modules')

/** The built renderer, served over the `app://` protocol. */
export const rendererRoot = path.join(buildRoot, 'renderer')

export const preloadPath = path.join(buildRoot, 'preload/preload.js')

export const documentationArchivePath = path.join(buildRoot, 'documentation.zip')
