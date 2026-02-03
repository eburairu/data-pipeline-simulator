// Shared Type Definitions

import { type DBFilter } from './VirtualDB';

export type DataValue = string | number | boolean | null | undefined | Date;
export type DataRow = Record<string, DataValue>;

export interface FieldDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object';
  description?: string;
}

export interface Schema {
  fields: FieldDefinition[];
}

export interface DataSourceDefinition {
  id: string;
  name: string;
  host: string;
  path: string;
}

export type GeneratorType = 'static' | 'randomInt' | 'randomFloat' | 'sin' | 'cos' | 'sequence' | 'uuid' | 'list' | 'timestamp';

export interface ColumnSchema {
  id: string;
  name: string;
  type: GeneratorType;
  params: Record<string, string | number | boolean | string[] | number[]>;
}

export interface GenerationJob {
  id: string;
  name: string;
  dataSourceId: string;
  fileNamePattern: string;
  fileContent: string;
  mode?: 'template' | 'schema';
  rowCount?: number;
  schema?: ColumnSchema[];
  executionInterval: number;
  enabled: boolean;
}

export interface DataSourceSettings {
  definitions: DataSourceDefinition[];
  jobs: GenerationJob[];
}

export interface TopicDefinition {
  id: string;
  name: string;
  retentionPeriod: number;
}

export type Topic = TopicDefinition;

// 収集ジョブの増分処理モード
export type LoadMode = 'full' | 'incremental' | 'initial_and_incremental';

// 増分処理の設定
export interface IncrementalConfig {
  trackingMethod: 'timestamp' | 'processed_list';  // 追跡方法
  lastProcessedTimestamp?: number;                 // 最終処理タイムスタンプ（timestamp方式用）
}

// リトライ機構の設定
export interface RetryConfig {
  maxRetries: number;           // 最大リトライ回数（デフォルト: 3）
  retryDelayMs: number;         // リトライ間隔（ミリ秒、デフォルト: 1000）
  backoffMultiplier?: number;   // 指数バックオフ係数（デフォルト: 2）
  continueOnError?: boolean;    // エラー発生時も次のファイル処理を継続（デフォルト: false）
}

// Phase 2: 収集トリガータイプ
export type CollectionTriggerType = 'polling' | 'file_listener';

// Phase 2: ファイルリスナーの設定
export interface FileListenerConfig {
  eventTypes: ('create' | 'update' | 'delete')[];  // 監視するイベントタイプ
  stabilityCheckMs?: number;                       // ファイル安定性チェック時間（デフォルト: 1000）
  debounceMs?: number;                             // デバウンス時間（デフォルト: 500）
}

// Phase 2: CDCモード
export type CDCMode = 'query_based' | 'log_based';

// Phase 2: CDC設定
export interface CDCConfig {
  mode: CDCMode;              // CDCモード
  sourceTableId: string;      // ソーステーブルID
  trackingColumn?: string;    // 追跡カラム（query-based用）
  captureDeletes?: boolean;   // DELETE操作もキャプチャ（デフォルト: true）
}

// Phase 3: スケジュールタイプ
export type ScheduleType = 'interval' | 'cron' | 'manual';

// Phase 3: Cronスケジュール設定
export interface CronScheduleConfig {
  expression: string;   // 簡易Cron式: "0 9 * * *" = 毎日9時
  timezone?: string;    // タイムゾーン（デフォルト: システムデフォルト）
}

// Phase 4: 行フィルター
export interface RowFilter {
  field: string;                                              // フィルター対象フィールド
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'contains';  // 演算子
  value: string;                                              // 比較値
  logicalOperator?: 'AND' | 'OR';                            // 複数フィルタの結合（デフォルト: 'AND'）
}

// Phase 4: ファイル操作アクション
export interface FileActionConfig {
  action: 'compress' | 'decompress';  // アクション種別
  format?: 'zip' | 'gzip';            // 圧縮形式（シミュレーション用）
}

export interface CollectionJob {
  id: string;
  name: string;
  sourceConnectionId: string;
  sourcePath: string;
  filterRegex: string;
  targetType?: 'host' | 'topic';
  targetConnectionId?: string;
  targetPath?: string;
  targetTopicId?: string;
  bandwidth: number;
  renamePattern: string;
  executionInterval: number;
  enabled: boolean;
  processingTime?: number;
  triggerSubscriptions?: boolean;
  /** If true, delete source file after successful transfer. Default: true (move). If false, copy the file. */
  deleteSourceAfterTransfer?: boolean;
  // Phase 1: 増分処理とリトライ機構
  loadMode?: LoadMode;                    // 読み込みモード（デフォルト: 'full'）
  incrementalConfig?: IncrementalConfig;  // 増分処理の設定
  retryConfig?: RetryConfig;              // リトライ機構の設定
  // Phase 2: イベント駆動収集とCDC
  triggerType?: CollectionTriggerType;    // トリガータイプ（デフォルト: 'polling'）
  fileListenerConfig?: FileListenerConfig; // ファイルリスナー設定
  cdcEnabled?: boolean;                   // CDCを有効化
  cdcConfig?: CDCConfig;                  // CDC設定
  // Phase 3: スケジューリング強化
  scheduleType?: ScheduleType;            // スケジュールタイプ（デフォルト: 'interval'）
  cronConfig?: CronScheduleConfig;        // Cronスケジュール設定
  // Phase 4: 高度な機能
  rowFilters?: RowFilter[];               // 行レベルフィルター
  parallelBatchSize?: number;             // 並列ファイルバッチサイズ（デフォルト: 1）
  preActions?: FileActionConfig[];        // 収集前のアクション
  postActions?: FileActionConfig[];       // 収集後のアクション
}

export interface CollectionSettings {
  jobs: CollectionJob[];
  processingTime: number;
}

export interface DeliveryJob {
  id: string;
  name: string;
  sourceType?: 'host' | 'topic';
  sourceConnectionId?: string;
  sourcePath?: string;
  sourceTopicId?: string;
  targetConnectionId: string;
  targetPath: string;
  filterRegex: string;
  bandwidth: number;
  processingTime: number;
  executionInterval: number;
  enabled: boolean;
  /** If true, delete source file after successful transfer. Default: true (move). If false, copy the file. Only applies when sourceType is 'host'. */
  deleteSourceAfterTransfer?: boolean;
}

export interface DeliverySettings {
  jobs: DeliveryJob[];
}

export interface EtlSettings {
  sourceHost: string;
  sourcePath: string;
  rawTableName: string;
  summaryTableName: string;
  processingTime: number;
  executionInterval: number;
}

export interface Host {
  name: string;
  directories: string[];
}

export interface ColumnDefinition {
  name: string;
  type: string;
}

export interface TableDefinition {
  id: string;
  name: string;
  columns: ColumnDefinition[];
}

export type ConnectionType = 'file' | 'database';

export interface ConnectionDefinition {
  id: string;
  name: string;
  type: ConnectionType;
  host: string;
}

export interface DashboardItem {
  id: string;
  title?: string;
  tableId: string;
  viewType: 'table' | 'chart';
  filters: DBFilter[];
  chartConfig?: {
    xAxis: string;
    yAxis: string;
  };
  refreshInterval: number;
}

export interface BiDashboardSettings {
  showDashboard: boolean;
  items: DashboardItem[];
}