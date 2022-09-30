export enum ClauseType {
	In = 'in',
	Named = 'named',
	With = 'with',
	LinkedFrom = 'linked from'
}

export interface PartialClauseText {
	text: string
}

export interface PartialClauseRegex {
	regex: RegExp
}

export interface PartialClauseReference {
	reference: string
}

export interface PartialClauseQuery {
	query: Query
}

export type PartialClauseValue = PartialClauseText | PartialClauseRegex | PartialClauseReference | PartialClauseQuery

export type Clause = { type: ClauseType } & PartialClauseValue

export interface ClauseGroup {
	join: 'and' | 'or'
	clauses: ClauseOrGroup[]
}

type ClauseOrGroup = Clause | ClauseGroup

export interface Query extends ClauseGroup {
	forms: string[]
}

export function isClause(item: ClauseOrGroup): item is Clause {
	return typeof (item as Clause).type === 'string'
}

export function isGroup(item: ClauseOrGroup): item is ClauseGroup {
	return typeof (item as ClauseGroup).join === 'string'
}

export function isQuery(item: ClauseGroup | Query): item is Query {
	return 'forms' in item
}