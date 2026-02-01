export type TransformationType = 
  | 'source' | 'target' | 'filter' | 'expression' | 'aggregator' 
  | 'validator' | 'joiner' | 'lookup' | 'router' | 'sorter' 
  | 'union' | 'normalizer' | 'rank' | 'sequence' | 'updateStrategy' 
  | 'cleansing' | 'deduplicator' | 'pivot' | 'unpivot' | 'sql' 
  | 'webService' | 'hierarchyParser';

export interface SourceConfig {
  connectionId: string;
  deleteAfterRead?: boolean;
  filenameColumn?: string;
}

export interface TargetConfig {
  connectionId: string;
  truncate?: boolean;
  updateColumns?: string[];
  deduplicationKeys?: string[];
  duplicateBehavior?: 'error' | 'ignore' | 'update';
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
  | { id: string; type: 'source'; name: string; position: { x: number, y: number }; config: SourceConfig }
  | { id: string; type: 'target'; name: string; position: { x: number, y: number }; config: TargetConfig }
  | { id: string; type: 'filter'; name: string; position: { x: number, y: number }; config: FilterConfig }
  | { id: string; type: 'expression'; name: string; position: { x: number, y: number }; config: ExpressionConfig }
  | { id: string; type: 'aggregator'; name: string; position: { x: number, y: number }; config: AggregatorConfig }
  | { id: string; type: 'validator'; name: string; position: { x: number, y: number }; config: ValidatorConfig }
  | { id: string; type: 'joiner'; name: string; position: { x: number, y: number }; config: JoinerConfig }
  | { id: string; type: 'lookup'; name: string; position: { x: number, y: number }; config: LookupConfig }
  | { id: string; type: 'router'; name: string; position: { x: number, y: number }; config: RouterConfig }
  | { id: string; type: 'sorter'; name: string; position: { x: number, y: number }; config: SorterConfig }
  | { id: string; type: 'union'; name: string; position: { x: number, y: number }; config: UnionConfig }
  | { id: string; type: 'normalizer'; name: string; position: { x: number, y: number }; config: NormalizerConfig }
  | { id: string; type: 'rank'; name: string; position: { x: number, y: number }; config: RankConfig }
  | { id: string; type: 'sequence'; name: string; position: { x: number, y: number }; config: SequenceConfig }
  | { id: string; type: 'updateStrategy'; name: string; position: { x: number, y: number }; config: UpdateStrategyConfig }
  | { id: string; type: 'cleansing'; name: string; position: { x: number, y: number }; config: CleansingConfig }
  | { id: string; type: 'deduplicator'; name: string; position: { x: number, y: number }; config: DeduplicatorConfig }
  | { id: string; type: 'pivot'; name: string; position: { x: number, y: number }; config: PivotConfig }
  | { id: string; type: 'unpivot'; name: string; position: { x: number, y: number }; config: UnpivotConfig }
  | { id: string; type: 'sql'; name: string; position: { x: number, y: number }; config: SqlConfig }
  | { id: string; type: 'webService'; name: string; position: { x: number, y: number }; config: WebServiceConfig }
  | { id: string; type: 'hierarchyParser'; name: string; position: { x: number, y: number }; config: HierarchyParserConfig };

export interface MappingLink {
  id: string;
  sourceId: string;
  targetId: string;
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