exports.default = async function(config) {
	const jsignPath = process.env.JSIGN_PATH
	const jsignStorepass = process.env.JSIGN_STOREPASS

	if (!jsignPath) {
		throw "JSIGN_PATH environment variable must be configured."
	}

	if (!jsignStorepass) {
		throw "JSIGN_STOREPASS environment variable must be configured."
	}

	require('child_process').execSync(
		`java -jar ${jsignPath} --storetype YUBIKEY --storepass ${jsignStorepass} --alg ${config.hash} --tsaurl http://timestamp.digicert.com ${config.path}`,
		{
			stdio: 'inherit'
		}
	)
}
