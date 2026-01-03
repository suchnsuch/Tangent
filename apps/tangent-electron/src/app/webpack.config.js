const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TsConfigPathsPlugin = require('tsconfig-paths-webpack-plugin')
const path = require('path');

// TODO: Make this not a copy paste
const mode = process.env.NODE_ENV || 'production';
const prod = mode === 'production';

module.exports = {
	entry: {
		'bundle/app': ['./src/app/app.js']
	},
	resolve: {
		extensions: ['.mjs', '.js', '.svelte', '.ts'],
		mainFields: ['svelte', 'browser', 'module', 'main'],
		conditionNames: ['svelte', 'browser', 'import'],
		plugins: [
			new TsConfigPathsPlugin()
		]
	},
	output: {
		path: path.join(__dirname, '../../__build'),
		filename: '[name].js',
		chunkFilename: '[name].[id].js'
	},
	target: 'web',
	module: {
		rules: [
			{
				test: /\.svelte$/,
				use: {
					loader: 'svelte-loader',
					options: {
						compilerOptions: {
							dev: !prod
						},
						emitCss: prod,
						hotReload: !prod,
						preprocess: require('../../svelte.config').preprocess,
						onwarn: (warning, handler) => {
							switch (warning.code) {
								case 'a11y-click-events-have-key-events':
								case 'a11y-no-noninteractive-tabindex':
								case 'a11y-no-noninteractive-element-interactions':
								case 'a11y-no-static-element-interactions':
								case 'css-unused-selector':
									return
							}
							//console.log(warning)
							handler(warning)
						}
					}
				}
			},
			{
				test: /pdf\.worker\.min\.mjs/,
				type: 'asset/resource'
			},
			{
				test: /\.js$/,
				resolve: { fullySpecified: false }
			},
			{
				test: /\.ts$/,
				use: 'ts-loader',
				exclude: /node_modules/
			},
			// Rule: SASS
			{
				test: /\.(scss|sass)$/,
				use: [
					{
						loader: MiniCssExtractPlugin.loader
					},
					{
						loader: 'css-loader',
						options: {
							url: false
						}
					},
					{
						loader: 'sass-loader',
						options: {
							api: 'modern-compiler'
						}
					}
				]
			},
			{
				test: /\.css$/,
				use: [
					MiniCssExtractPlugin.loader,
					{
						loader: 'css-loader',
						options: {
							url: false
						}
					}
				],
			},
			{
				// required to prevent errors from Svelte on Webpack 5+
				test: /node_modules\/svelte\/.*\.mjs$/,
				resolve: {
					fullySpecified: false
				}
			}
		]
	},
	mode,
	plugins: [
		new MiniCssExtractPlugin({
			filename: '[name].css'
		})
	],
	// Good source maps in prod, faster-ish maps in dev: https://webpack.js.org/configuration/devtool/#devtool
	devtool: prod ? 'nosources-source-map' : 'eval-source-map',
	devServer: {
		hot: true
	}
};
