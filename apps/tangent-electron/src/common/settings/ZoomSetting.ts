import Setting from "./Setting"

export default class ZoomSetting extends Setting<number> {
	applyWheelEvent(event: WheelEvent, sensitivity: number = .25) {
		let change = event.deltaY
		if (Math.abs(change) > 25) {
			// Assume this is a mouse wheel and clamp hard
			change *= 0.005
		}
		else {
			// Assume this is a trackpad and clamp less
			change *= 0.1
		}

		let newScale = this.value
		newScale -= (change * newScale) * sensitivity
		this.set(newScale)
	}
}
