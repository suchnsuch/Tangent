import type { Query, QueryError, QueryParseResult } from '@such-n-such/tangent-query-parser'
import type { TreeNodeReference } from 'common/nodeReferences'

export interface QueryResult {
	query: Query | QueryParseResult
	items?: TreeNodeReference[]
	errors?: QueryError[]
}