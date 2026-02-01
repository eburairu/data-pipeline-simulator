
export type TransformationType = 'source' | 'target' | 'filter' | 'expression' | 'aggregator' | 'validator' | 'joiner' | 'lookup' | 'router' | 'sorter' | 'union' | 'normalizer' | 'rank' | 'sequence' | 'updateStrategy' | 'cleansing' | 'deduplicator' | 'pivot' | 'unpivot' | 'sql' | 'webService' | 'hierarchyParser';

export interface TransformationConfig {
  // Common
  [key: string]: any;
}

export interface SourceConfig extends TransformationConfig {
  connectionId: string; // Refers to a ConnectionDefinition
  deleteAfterRead?: boolean;
  filenameColumn?: string; // If set, adds the source filename as a column with this name (like standard ETL)
}

export interface TargetConfig extends TransformationConfig {
  connectionId: string;
  truncate?: boolean;
  updateColumns?: string[]; // Columns to use as keys for update/delete operations
  deduplicationKeys?: string[];
  duplicateBehavior?: 'error' | 'ignore' | 'update';
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

// Joiner: 2つのソースからのデータを結合キーで結合する（ETL機能）
export interface JoinerConfig extends TransformationConfig {
  joinType: 'inner' | 'left' | 'right' | 'full';
  masterKeys: string[];  // マスター側の結合キー
  detailKeys: string[];  // 詳細側の結合キー
}

// Lookup: 参照テーブルからデータを参照（ETL機能）
export interface LookupConfig extends TransformationConfig {
  connectionId: string;  // 参照テーブルの接続
  lookupKeys: string[];  // 入力側のルックアップキー
  referenceKeys: string[];  // 参照テーブル側のキー
  returnFields: string[];  // 返すフィールド
  defaultValue?: string;  // 一致なし時のデフォルト値
}

// Router: 条件に基づいて行を振り分け（ETL機能）
export interface RouterRoute {
  condition: string;  // e.g. "amount > 1000"
  groupName: string;  // e.g. "high_value"
}

export interface RouterConfig extends TransformationConfig {
  routes: RouterRoute[];
  defaultGroup: string;  // 条件にマッチしない行の行き先
}

// Sorter: 指定フィールドでソート（ETL機能）
export interface SortField {
  field: string;
  direction: 'asc' | 'desc';
}

export interface SorterConfig extends TransformationConfig {
  sortFields: SortField[];
}

// Union: 複数ソースをマージ（ETL機能）
export interface UnionConfig extends TransformationConfig {
  // Union は複数の入力を単純にマージするため設定は最小限
  // 入力はリンクで接続される
}

// Normalizer: 1行を複数行に展開（ETL機能）
export interface NormalizerConfig extends TransformationConfig {
  arrayField: string;  // 展開する配列フィールド
  outputFields: string[];  // 出力フィールド名（配列の各要素に対応）
  keepOriginalFields: boolean;  // 元のフィールドを保持するか
}

// Rank: ランキング付与（ETL機能）
export interface RankConfig extends TransformationConfig {
  partitionBy: string[];  // パーティションキー
  orderBy: { field: string; direction: 'asc' | 'desc' }[];  // ソート順
  rankField: string;  // ランク値を格納するフィールド名
  rankType: 'rank' | 'denseRank' | 'rowNumber';  // ランクタイプ
}

// Sequence: 連番生成（ETL機能）
export interface SequenceConfig extends TransformationConfig {
  sequenceField: string;  // 連番を格納するフィールド名
  startValue: number;  // 開始値
  incrementBy: number;  // 増分
}

// UpdateStrategy: Insert/Update/Delete フラグ設定（ETL機能）
export interface UpdateStrategyConfig extends TransformationConfig {
  strategyField: string;  // 戦略フラグを格納するフィールド名
  defaultStrategy: 'insert' | 'update' | 'delete' | 'reject';  // デフォルト戦略
  conditions: { condition: string; strategy: 'insert' | 'update' | 'delete' | 'reject' }[];  // 条件付き戦略
}

// Cleansing: データクレンジング（ETL機能）
export interface CleansingRule {
  field: string;
  operation: 'trim' | 'upper' | 'lower' | 'nullToDefault' | 'replace';
  defaultValue?: string;  // nullToDefault, replace用
  replacePattern?: string;  // replace用
  replaceWith?: string;  // replace用
}

export interface CleansingConfig extends TransformationConfig {
  rules: CleansingRule[];
}

// Deduplicator: 重複行削除（ETL機能）
export interface DeduplicatorConfig extends TransformationConfig {
  keys: string[]; // 重複判定キー（空の場合は全フィールド）
  caseInsensitive: boolean;
}

// Pivot: 行→列変換（ETL機能）
export interface PivotConfig extends TransformationConfig {
  groupByFields: string[]; // グループ化キー
  pivotField: string; // 列名になる値を持つフィールド
  valueField: string; // 値になるフィールド
  aggregates?: string[]; // ピボット後の集計（sum, max等 - 簡易実装ではoptional）
}

// Unpivot: 列→行変換（ETL機能）
export interface UnpivotConfig extends TransformationConfig {
  fieldsToUnpivot: string[]; // 行に展開するフィールド群
  newHeaderFieldName: string; // 元のフィールド名を格納する列名
  newValueFieldName: string; // 値を格納する列名
}

// SQL: SQL実行（ETL機能 - 簡易シミュレーション）
export interface SqlConfig extends TransformationConfig {
  sqlQuery: string; // 実行するSQL
  dbConnectionId?: string; // 接続先（あれば）
  mode: 'query' | 'procedure' | 'script';
}

// Web Service Consumer: REST API呼び出し
export interface WebServiceConfig extends TransformationConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers: { key: string; value: string }[];
  requestBody?: string; // POST/PUT用 (Template supported)
  responseMap?: { path: string; field: string }[]; // JSONレスポンスのマッピング
}

// Hierarchy Parser: 階層データ解析
export interface HierarchyParserConfig extends TransformationConfig {
  inputField: string; // JSON文字列フィールド
  outputFields: { path: string; name: string; type: 'string' | 'number' | 'boolean' }[];
}

export interface Transformation {
  id: string;
  type: TransformationType;
  name: string;
  position: { x: number, y: number }; // For visual layout
  config: SourceConfig | TargetConfig | FilterConfig | ExpressionConfig | AggregatorConfig | ValidatorConfig | JoinerConfig | LookupConfig | RouterConfig | SorterConfig | UnionConfig | NormalizerConfig | RankConfig | SequenceConfig | UpdateStrategyConfig | CleansingConfig | DeduplicatorConfig | PivotConfig | UnpivotConfig | SqlConfig | WebServiceConfig | HierarchyParserConfig;
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
  parameters?: Record<string, string>; // Default values for parameters
}

export interface MappingTask {
  id: string;
  name: string;
  mappingId: string;
  executionInterval: number; // ms
  enabled: boolean;
  dependencies?: string[]; // Task IDs that this task depends on
  parameters?: Record<string, string>; // Override parameters for execution
  badFileDir?: string; // Directory to store bad/rejected rows
  parameterFileName?: string; // Path to parameter file
  stopOnErrors?: number; // Stop if error count exceeds this (0 = disabled)
}
