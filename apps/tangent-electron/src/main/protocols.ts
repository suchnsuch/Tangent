import { app, protocol } from 'electron'

import { appProtocolScheme, APP_PROTOCOL, handleAppProtocol } from './appProtocol'
import { fileProtocolScheme, handleFileProtocol } from './fileProtocol'
import { FILE_PROTOCOL } from 'common/fileUrl'

/**
 * Sets up Tangent's custom protocols. Must be called before the app is ready.
 *
 * Electron wants the two halves of this at different moments, and there is no
 * single point where both are legal: schemes have to be declared before the app
 * is ready, and `protocol.handle` needs a session, which does not exist until
 * after. `registerSchemesAsPrivileged` also may only be called once for the
 * whole app, which is why every scheme is declared together here rather than by
 * the module that implements it.
 */
export function registerSchemes() {
	protocol.registerSchemesAsPrivileged([
		appProtocolScheme,
		fileProtocolScheme
	])

	app.whenReady().then(() => {
		protocol.handle(APP_PROTOCOL, handleAppProtocol)
		protocol.handle(FILE_PROTOCOL, handleFileProtocol)
	})
}
