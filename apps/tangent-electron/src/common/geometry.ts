export interface Point {
	x: number,
	y: number
}

export namespace Point {
	export const Zero: Point = { x: 0, y: 0 }
	export const Up: Point = { x: 0, y: -1 }
	export const Down: Point = { x: 0, y: 1 }
	export const Left: Point = { x: -1, y: 0 }
	export const Right: Point = { x: 1, y: 0 }

	export function make(x: number, y: number): Point
	export function make(otherPoint: Point): Point
	export function make(x: number | Point, y?: number) {
		if (y != null) {
			return { x, y }
		}
		return {
			x: (x as Point).x,
			y: (x as Point).y
		}
	}

	export function distance(a: Point, b: Point) {
		return Math.sqrt((a.x - b.x) * (a.x -b.x) + (a.y - b.y) * (a.y - b.y))
	}

	export function squareDistance(a: Point, b: Point) {
		return (a.x - b.x) * (a.x -b.x) + (a.y - b.y) * (a.y - b.y)
	}

	export function add(a: Point, b: Point) {
		return make(a.x + b.x, a.y + b.y)
	}

	export function subtract(a: Point, b: Point) {
		return make(a.x - b.x, a.y - b.y)
	}

	export function invert(point: Point) {
		return make(-point.x, -point.y)
	}

	export function normalize(point: Point) {
		const magnitude = distance(Zero, point)
		return make(point.x / magnitude, point.y / magnitude)
	}

	export function dot(a: Point, b: Point) {
		return a.x * b.x + a.y * b.y
	}

	export function slope(point: Point) {
		return point.x / point.y
	}
}

interface BezierPointConstructorOptions {
	x: number
	y: number
	relativeIn?: Point
	relativeOut?: Point
	worldIn?: Point
	worldOut?: Point
}

export enum CoordinateSpace {
	Relative,
	World
}

export enum BezierTangentAdjustmentMode {
	Isolated, // Only affect the set value
	Mirrored // Apply a mirror to the opposite
}

export class BezierPoint {
	x: number
	y: number

	private _inTangent: Point
	private _outTangent: Point

	constructor(options: BezierPointConstructorOptions) {
		this.x = options.x
		this.y = options.y

		if (options.relativeIn) {
			this._inTangent = Point.make(options.relativeIn)
		}
		if (options.relativeOut) {
			this._outTangent = Point.make(options.relativeOut)
		}
		if (options.worldIn) {
			this._inTangent = Point.subtract(options.worldIn, this)
		}
		if (options.worldOut) {
			this._outTangent = Point.subtract(options.worldOut, this)
		}
		
		if (!this._inTangent) {
			this._inTangent = this._outTangent != null ? Point.invert(this._outTangent) : Point.Left
		}
		if (!this._outTangent) {
			this._outTangent = this._inTangent != null ? Point.invert(this._inTangent) : Point.Right
		}
	}

	setInCoords(x: number, y: number, space = CoordinateSpace.Relative, mode = BezierTangentAdjustmentMode.Isolated) {
		let point = Point.make(x, y)
		if (space === CoordinateSpace.World) {
			point = Point.subtract(point, this)
		}

		this._inTangent = point
		if (mode === BezierTangentAdjustmentMode.Mirrored) {
			this._outTangent = Point.invert(point)
		}
	}

	setInPoint(point: Point, space = CoordinateSpace.Relative, mode = BezierTangentAdjustmentMode.Isolated) {
		this.setInCoords(point.x, point.y, space, mode)
	}

	setOutCoords(x: number, y: number, space = CoordinateSpace.Relative, mode = BezierTangentAdjustmentMode.Isolated) {
		let point = Point.make(x, y)
		if (space === CoordinateSpace.World) {
			point = Point.subtract(point, this)
		}

		this._outTangent = point
		if (mode === BezierTangentAdjustmentMode.Mirrored) {
			this._inTangent = Point.invert(point)
		}
	}

	setOutPoint(point: Point, space = CoordinateSpace.Relative, mode = BezierTangentAdjustmentMode.Isolated) {
		this.setOutCoords(point.x, point.y, space, mode)
	}

	get worldIn(): Point {
		return Point.add(this, this._inTangent)
	}

	getRelativeIn() { return this._inTangent }

	get worldOut(): Point {
		return Point.add(this, this._outTangent)
	}

	getRelativeOut() { return this._outTangent }

	getDebugSVG() {
		let worldIn = this.worldIn
		let worldOut = this.worldOut
		return `<circle cx="${this.x}" cy="${this.y}" r="3" fill="cyan"></circle>
		<circle cx="${worldIn.x}" cy="${worldIn.y}" r="2" fill="green"></circle>
		<circle cx="${worldOut.x}" cy="${worldOut.y}" r="2" fill="red"></circle>
		<line x1="${worldIn.x}" x2="${worldOut.x}" y1="${worldIn.y}" y2="${worldOut.y}" stroke="grey"></line>`
	}
}

export namespace BezierCurve  {
	export function make(...args: BezierPointConstructorOptions[]) {
		return args.map(a => new BezierPoint(a))
	}

	export function toSVGPathDefintion(points: BezierPoint[]) {
		if (points.length < 2) {
			throw new Error('Must pass in at least two BezierPoints to render a curve.')
		}
		let path = ''
		for (let i = 0; i < points.length - 1; i++) {
			const point1 = points[i]
			const point2 = points[i + 1]

			if (i === 0) {
				path += ` M ${point1.x} ${point1.y}` // Move to the starting point
			}

			const point1Out = point1.worldOut
			const point2In = point2.worldIn

			// Draw the bezier curve
			path += ` C ${point1Out.x} ${point1Out.y}, ${point2In.x} ${point2In.y}, ${point2.x} ${point2.y}`
		}
		return path
	}
}
