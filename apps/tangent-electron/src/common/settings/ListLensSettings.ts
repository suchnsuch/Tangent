import { ObjectStore } from 'common/stores';
import { NodeSortStore } from './Sorting';

export default class ListLensSettings extends ObjectStore {
	sorting = new NodeSortStore()

	constructor() {
		super()
		this.setupObservables()
	}
}
