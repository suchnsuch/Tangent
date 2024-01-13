import { ObjectStore, WritableStore } from 'common/stores'

export default class SystemMenu extends ObjectStore {

	showMenu = new WritableStore<boolean>(false)
	section = new WritableStore<string>(null)

	constructor() {
		super()
		this.setupObservables()
	}
}
