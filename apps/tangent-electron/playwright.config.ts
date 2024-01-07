import path from 'path'
import { defineConfig } from '@playwright/test'
import { TangentOptions } from './tests-integration/tangent'

export default defineConfig<TangentOptions>({
	projects: [
		{
			name: 'Tests',
			testMatch: /.*tests-integration.*\.test\.(ts)/,
		},
		{
			name: 'Benchmarks',
			testMatch: /.*tests-integration.*\.bench\.(ts)/,
		},
		{
			name: 'Screenshots',
			testMatch: /.*tests-integration.*\.screenshot\.ts/,
			use: {
				workspace: path.resolve(path.join(
					__dirname, '../TestFiles/ScreenshotWorkspace/My Workspace'
				)),
				resetWorkspace: 'test'
			}
		}
	],
	workers: 1
})
