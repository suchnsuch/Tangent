export type PatchObserver = (patch: any, reverse:any, source?: any) => void

export interface Patchable {
	applyPatch(patch: any): boolean
	observePatch(observer: PatchObserver): () => void
	unobservePatch(observer: PatchObserver)
}

export namespace Patchable {
	export function isPatchable(obj: any): obj is Patchable {
		return obj
			&& typeof obj.applyPatch === 'function'
			&& typeof obj.observePatch === 'function'
	}
}
