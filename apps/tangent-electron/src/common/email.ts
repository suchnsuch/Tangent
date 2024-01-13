type MailToOptions = {
	subject?: string,
	body?: string
}

export function mailTo(address: string, opts?: MailToOptions) {
	let href = 'mailto:' + address
	
	if (opts) {
		let first = true
		for (const key of Object.keys(opts)) {
			if (first) {
				href += '?'
				first = false
			}
			else {
				href += '&'
			}

			href += key
			href += '='
			href += encodeURIComponent(opts[key])
		}
	}
	
	return href
}
