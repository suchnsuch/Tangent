export const channels = ['latest', 'beta', 'alpha', 'legacy'] as const
export const oss = ['mac', 'win', 'win_portable', 'linux', 'linux_arm64'] as const

export type SKUTypes = typeof oss[number]

export interface SKU {
	os: typeof oss[number]
	displayName: string
	path: string,
	version: string
	releaseDate: string
}

export interface Build {
	version: string
	releaseDate: string
	
	skus: {
		[K in typeof oss[number]]?: SKU
	}
}

export type BuildSet = {
	[K in typeof channels[number]]?: Build
}
