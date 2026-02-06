import { type CompressionFormat } from './types';

export type TransformationType = 
  | 'source' | 'target' | 'filter' | 'expression' | 'aggregator' 
  | 'validator' | 'joiner' | 'lookup' | 'router' | 'sorter' 
  | 'union' | 'normalizer' | 'rank' | 'sequence' | 'updateStrategy' 
  | 'cleansing' | 'deduplicator' | 'pivot' | 'unpivot' | 'sql' 
  | 'webService' | 'hierarchyParser';

export interface BaseTransformation {
  id: string;
  name: string;
  position: { x: number, y: number };
}

export interface SourceConfig {
  connectionId: string;
  path?: string;
  tableName?: string;
  deleteAfterRead?: boolean;
  filenameColumn?: string;
  decompression?: boolean;
}

export interface TargetConfig {
  connectionId?: string;
  targetType?: 'connection' | 'topic';
  topicId?: string;
  path?: string;
  tableName?: string;
  truncate?: boolean;
  updateColumns?: string[];
  deduplicationKeys?: string[];
  duplicateBehavior?: 'error' | 'ignore' | 'update';
  compressionActions?: CompressionFormat[];
}

export interface FilterConfig {
  condition: string;
}

export interface FieldExpression {
  name: string;
  expression: string;
}

export interface ExpressionConfig {
  fields: FieldExpression[];
}

export interface AggregateField {
  name: string;
  function: 'sum' | 'count' | 'avg' | 'min' | 'max';
  field: string;
}

export interface AggregatorConfig {
  groupBy: string[];
  aggregates: AggregateField[];
}

export interface ValidatorRule {
  field: string;
  type?: 'string' | 'number' | 'boolean';
  required?: boolean;
  regex?: string;
}

export interface ValidatorConfig {
  rules: ValidatorRule[];
  errorBehavior: 'skip' | 'error';
}

export interface JoinerConfig {
  joinType: 'inner' | 'left' | 'right' | 'full';
  masterKeys: string[];
  detailKeys: string[];
}

export interface LookupConfig {
  connectionId: string;
  path?: string;
  tableName?: string;
  lookupKeys: string[];
  referenceKeys: string[];
  returnFields: string[];
  defaultValue?: string;
}

export interface RouterRoute {
  condition: string;
  groupName: string;
}

export interface RouterConfig {
  routes: RouterRoute[];
  defaultGroup: string;
}

export interface SortField {
  field: string;
  direction: 'asc' | 'desc';
}

export interface SorterConfig {
  sortFields: SortField[];
}

export interface UnionConfig {}

export interface NormalizerConfig {
  arrayField: string;
  outputFields: string[];
  keepOriginalFields: boolean;
}

export interface RankConfig {
  partitionBy: string[];
  orderBy: { field: string; direction: 'asc' | 'desc' }[];
  rankField: string;
  rankType: 'rank' | 'denseRank' | 'rowNumber';
}

export interface SequenceConfig {
  sequenceField: string;
  startValue: number;
  incrementBy: number;
}

export interface UpdateStrategyConfig {
  strategyField: string;
  defaultStrategy: 'insert' | 'update' | 'delete' | 'reject';
  conditions: { condition: string; strategy: 'insert' | 'update' | 'delete' | 'reject' }[];
}

export interface CleansingRule {
  field: string;
  operation: 'trim' | 'upper' | 'lower' | 'nullToDefault' | 'replace';
  defaultValue?: string;
  replacePattern?: string;
  replaceWith?: string;
}

export interface CleansingConfig {
  rules: CleansingRule[];
}

export interface DeduplicatorConfig {
  keys: string[];
  caseInsensitive: boolean;
}

export interface PivotConfig {
  groupByFields: string[];
  pivotField: string;
  valueField: string;
  aggregates?: string[];
}

export interface UnpivotConfig {
  fieldsToUnpivot: string[];
  newHeaderFieldName: string;
  newValueFieldName: string;
}

export interface SqlConfig {
  sqlQuery: string;
  dbConnectionId?: string;
  mode: 'query' | 'procedure' | 'script';
}

export interface WebServiceConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers: { key: string; value: string }[];
  requestBody?: string;
  responseMap?: { path: string; field: string }[];
}

export interface HierarchyParserConfig {
  inputField: string;
  outputFields: { path: string; name: string; type: 'string' | 'number' | 'boolean' }[];
}

export type Transformation = 
  | SourceTransformation
  | TargetTransformation
  | FilterTransformation
  | ExpressionTransformation
  | AggregatorTransformation
  | ValidatorTransformation
  | JoinerTransformation
  | LookupTransformation
  | RouterTransformation
  | SorterTransformation
  | UnionTransformation
  | NormalizerTransformation
  | RankTransformation
  | SequenceTransformation
  | UpdateStrategyTransformation
  | CleansingTransformation
  | DeduplicatorTransformation
  | PivotTransformation
  | UnpivotTransformation
  | SqlTransformation
  | WebServiceTransformation
  | HierarchyParserTransformation;

export type SourceTransformation = BaseTransformation & { type: 'source'; config: SourceConfig };
export type TargetTransformation = BaseTransformation & { type: 'target'; config: TargetConfig };
export type FilterTransformation = BaseTransformation & { type: 'filter'; config: FilterConfig };
export type ExpressionTransformation = BaseTransformation & { type: 'expression'; config: ExpressionConfig };
export type AggregatorTransformation = BaseTransformation & { type: 'aggregator'; config: AggregatorConfig };
export type ValidatorTransformation = BaseTransformation & { type: 'validator'; config: ValidatorConfig };
export type JoinerTransformation = BaseTransformation & { type: 'joiner'; config: JoinerConfig };
export type LookupTransformation = BaseTransformation & { type: 'lookup'; config: LookupConfig };
export type RouterTransformation = BaseTransformation & { type: 'router'; config: RouterConfig };
export type SorterTransformation = BaseTransformation & { type: 'sorter'; config: SorterConfig };
export type UnionTransformation = BaseTransformation & { type: 'union'; config: UnionConfig };
export type NormalizerTransformation = BaseTransformation & { type: 'normalizer'; config: NormalizerConfig };
export type RankTransformation = BaseTransformation & { type: 'rank'; config: RankConfig };
export type SequenceTransformation = BaseTransformation & { type: 'sequence'; config: SequenceConfig };
export type UpdateStrategyTransformation = BaseTransformation & { type: 'updateStrategy'; config: UpdateStrategyConfig };
export type CleansingTransformation = BaseTransformation & { type: 'cleansing'; config: CleansingConfig };
export type DeduplicatorTransformation = BaseTransformation & { type: 'deduplicator'; config: DeduplicatorConfig };
export type PivotTransformation = BaseTransformation & { type: 'pivot'; config: PivotConfig };
export type UnpivotTransformation = BaseTransformation & { type: 'unpivot'; config: UnpivotConfig };
export type SqlTransformation = BaseTransformation & { type: 'sql'; config: SqlConfig };
export type WebServiceTransformation = BaseTransformation & { type: 'webService'; config: WebServiceConfig };
export type HierarchyParserTransformation = BaseTransformation & { type: 'hierarchyParser'; config: HierarchyParserConfig };

export type TransformationConfig = 
  | SourceConfig | TargetConfig | FilterConfig | ExpressionConfig | AggregatorConfig 
  | ValidatorConfig | JoinerConfig | LookupConfig | RouterConfig | SorterConfig 
  | UnionConfig | NormalizerConfig | RankConfig | SequenceConfig | UpdateStrategyConfig 
  | CleansingConfig | DeduplicatorConfig | PivotConfig | UnpivotConfig | SqlConfig 
  | WebServiceConfig | HierarchyParserConfig;

export interface MappingLink {
  id: string;
  sourceId: string;
  targetId: string;
  routerGroup?: string;
}

export interface Mapping {
  id: string;
  name: string;
  transformations: Transformation[];
  links: MappingLink[];
  parameters?: Record<string, string>;
}

export interface MappingTask {
  id: string;
  name: string;
  mappingId: string;
  executionInterval: number;
  enabled: boolean;
  dependencies?: string[];
  parameters?: Record<string, string>;
  badFileDir?: string;
  parameterFileName?: string;
  stopOnErrors?: number;
}

export interface TaskFlow {
  id: string;
  name: string;
  description?: string;
  taskIds: string[];
  executionInterval: number;
  enabled: boolean;
  parallelExecution?: boolean;
  layoutNodes?: Array<{ id: string; position: { x: number; y: number } }>;
  layoutLinks?: Array<{ id: string; source: string; target: string }>;
}