export function lazyInitializeSubscriptionList<T>(target: any, key: string, handler: T) {
	if (!target[key]) target[key] = []
	const list = target[key]

	list.push(handler)
	return () => {
		const index = list.indexOf(handler)
		if (index === list.length - 1) {
			list.pop()
		}
		else {
			const shift = list.pop()
			list[index] = shift
		}
	}
}
