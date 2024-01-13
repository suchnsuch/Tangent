const TsConfigPathsPlugin = require('tsconfig-paths-webpack-plugin')
const path = require('path')

// TODO: Make this not a copy paste
const mode = process.env.NODE_ENV || 'production';
const prod = mode === 'production';

module.exports = {
	entry: {
		'bundle/main': ['./src/main/index.ts']
	},
	resolve: {
		extensions: ['.mjs', '.js', '.ts', '.cjs'],
		plugins: [
			new TsConfigPathsPlugin()
		]
	},
	output: {
		path: path.join(__dirname, '../../__build'),
		filename: '[name].js',
		chunkFilename: '[name].[id].js'
	},
	target: 'electron-main',
	module: {
		rules: [
			{
				test: /\.js$/,
				resolve: { fullySpecified: false }
			},
			{
				test: /\.ts$/,
				use: 'ts-loader',
				exclude: /node_modules/
			}
		]
	},
	externalsPresets: {
		electron: true,
		node: true
	},
	externals: {
		'fsevents': 'commonjs fsevents',
		//'electron': 'commonjs electron',
		'electron-reload': 'commonjs electron-reload',
		'font-list': 'commonjs font-list',
		'yargs': 'commonjs yargs',
		'yargs/helpers': 'commonjs yargs/helpers',
	},
	mode,
	// Good source maps in prod, faster-ish maps in dev: https://webpack.js.org/configuration/devtool/#devtool
	devtool: prod ? 'nosources-source-map' : 'eval-source-map'
};
