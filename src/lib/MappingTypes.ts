
export type TransformationType = 'source' | 'target' | 'filter' | 'expression' | 'aggregator' | 'validator' | 'joiner';

export interface TransformationConfig {
  // Common
  [key: string]: any;
}

export interface SourceConfig extends TransformationConfig {
  connectionId: string; // Refers to a ConnectionDefinition
  deleteAfterRead?: boolean;
  filenameColumn?: string; // If set, adds the source filename as a column with this name (like IDMC CDI)
}

export interface TargetConfig extends TransformationConfig {
  connectionId: string;
  truncate?: boolean;
}

export interface FilterConfig extends TransformationConfig {
  condition: string; // e.g. "amount > 100" or "true"
}

export interface FieldExpression {
  name: string;
  expression: string; // e.g. "price * quantity" or just "fieldname"
}

export interface ExpressionConfig extends TransformationConfig {
  fields: FieldExpression[];
}

export interface AggregateField {
  name: string;
  function: 'sum' | 'count' | 'avg' | 'min' | 'max';
  field: string;
}

export interface AggregatorConfig extends TransformationConfig {
  groupBy: string[];
  aggregates: AggregateField[];
}

export interface ValidatorRule {
  field: string;
  type?: 'string' | 'number' | 'boolean';
  required?: boolean;
  regex?: string;
}

export interface ValidatorConfig extends TransformationConfig {
  rules: ValidatorRule[];
  errorBehavior: 'skip' | 'error';
}

// Joiner: 2つのソースからのデータを結合キーで結合する（IDMC CDI機能）
export interface JoinerConfig extends TransformationConfig {
  joinType: 'inner' | 'left' | 'right' | 'full';
  masterKeys: string[];  // マスター側の結合キー
  detailKeys: string[];  // 詳細側の結合キー
}

export interface Transformation {
  id: string;
  type: TransformationType;
  name: string;
  position: { x: number, y: number }; // For visual layout
  config: SourceConfig | TargetConfig | FilterConfig | ExpressionConfig | AggregatorConfig | ValidatorConfig | JoinerConfig;
}

export interface MappingLink {
  id: string;
  sourceId: string; // Transformation ID
  targetId: string; // Transformation ID
}

export interface Mapping {
  id: string;
  name: string;
  transformations: Transformation[];
  links: MappingLink[];
}

export interface MappingTask {
  id: string;
  name: string;
  mappingId: string;
  executionInterval: number; // ms
  enabled: boolean;
}
