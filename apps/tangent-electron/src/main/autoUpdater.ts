import electronUpdater from 'electron-updater'

/**
 * electron-updater is not bundled, so it crosses the CommonJS boundary at
 * runtime. It exports `autoUpdater` through `Object.defineProperty` with a
 * getter, which constructs the right updater for the current platform on first
 * access. Node's CommonJS export detection is static, so it cannot see a getter
 * and `import { autoUpdater }` fails where every other export of the package
 * works. Reaching it through the default import is the way around that.
 *
 * This is a function rather than a re-exported binding so that the getter is
 * not run at import time. Touching it builds the platform's updater, which
 * needs a live electron app, so anything that merely imports a module in this
 * graph would otherwise fail outside of electron.
 */
export function getAutoUpdater() {
	return electronUpdater.autoUpdater
}
