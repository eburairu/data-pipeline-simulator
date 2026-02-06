/**
 * アプリケーション全体で使用する定数を定義
 * マジックナンバーや繰り返し使用される文字列を集約
 */

// シミュレーション関連定数
export const SIMULATION = {
  /** デフォルトのシミュレーション速度（ミリ秒） */
  DEFAULT_INTERVAL: 1000,
  /** 最小シミュレーション間隔（ミリ秒） */
  MIN_INTERVAL: 100,
  /** 最大シミュレーション間隔（ミリ秒） */
  MAX_INTERVAL: 5000,
  /** デフォルトのバッチサイズ */
  DEFAULT_BATCH_SIZE: 100,
} as const;

// UI関連定数
export const UI = {
  /** モバイルブレークポイント（ピクセル） */
  MOBILE_BREAKPOINT: 768,
  /** タブレットブレークポイント（ピクセル） */
  TABLET_BREAKPOINT: 1024,
  /** デフォルトのアニメーション時間（ミリ秒） */
  DEFAULT_ANIMATION_DURATION: 200,
  /** リスト表示の初期制限数 */
  INITIAL_DISPLAY_LIMIT: 20,
} as const;

// ストレージ関連定数
export const STORAGE = {
  /** VirtualDBのデフォルトレコード上限 */
  DEFAULT_RECORD_LIMIT: 10000,
  /** ファイルシステムのデフォルトパス区切り文字 */
  PATH_SEPARATOR: '/',
  /** デフォルトホスト名 */
  DEFAULT_HOST: 'localhost',
} as const;

// デフォルト値
export const DEFAULT_VALUES = {
  /** デフォルトのファイル形式 */
  FILE_FORMAT: 'csv',
  /** デフォルトのエンコーディング */
  ENCODING: 'UTF-8',
  /** デフォルトのCSV区切り文字 */
  CSV_DELIMITER: ',',
  /** デフォルトのタイムゾーン */
  TIMEZONE: 'Asia/Tokyo',
} as const;

// パイプラインノードサイズ
export const NODE_DIMENSIONS = {
  /** 処理ノードの幅 */
  PROCESS_WIDTH: 180,
  /** 処理ノードの高さ */
  PROCESS_HEIGHT: 80,
  /** ストレージノードの幅 */
  STORAGE_WIDTH: 220,
  /** ストレージノードの高さ */
  STORAGE_HEIGHT: 120,
  /** モバイルサイズのスケール */
  MOBILE_SCALE: 0.8,
} as const;

// レイアウト関連定数
export const LAYOUT = {
  /** ノード間の水平方向の間隔 */
  NODE_SEP: 50,
  /** ランク間の垂直方向の間隔 */
  RANK_SEP: 50,
} as const;

// システムテーブル名
export const SYSTEM_TABLES = {
  /** トピックサブスクリプション状態追跡テーブル */
  SUBSCRIPTION_STATE: '_sys_subscription_state',
} as const;

// パスプレフィックス
export const PATH_PREFIXES = {
  /** トピックストレージのパスプレフィックス */
  TOPICS: '/topics',
} as const;

// ジョブステップキープレフィックス
export const STEP_KEYS = {
  /** コレクションジョブのステップキープレフィックス */
  COLLECTION_TRANSFER: 'transfer_1',
  /** デリバリージョブのステップキープレフィックス */
  DELIVERY_TRANSFER: 'transfer_2',
  /** マッピングタスクのステップキープレフィックス */
  MAPPING_TASK: 'mapping_task',
  /** タスクフローのステップキープレフィックス */
  TASK_FLOW: 'task_flow',
} as const;

// タイムアウト・遅延定数
export const TIMEOUTS = {
  /** 保存結果メッセージの表示時間（ミリ秒） */
  SAVE_RESULT: 3000,
  /** デフォルトのリトライ遅延（ミリ秒） */
  RETRY_DELAY: 1000,
  /** マッピング依存関係の実行遅延（ミリ秒） */
  MAPPING_DEPENDENCY_DELAY: 500,
  /** トピック保持期間チェック周期（ミリ秒） */
  TOPIC_RETENTION_CHECK: 5000,
  /** 経過時間表示の更新間隔（ミリ秒） */
  ELAPSED_TIME_UPDATE: 1000,
  /** ダッシュボード自動リフレッシュ間隔（ミリ秒） */
  DASHBOARD_AUTO_REFRESH: 1000,
} as const;

// デフォルト実行パラメータ
export const EXECUTION_DEFAULTS = {
  /** デフォルトの実行間隔（ミリ秒） */
  INTERVAL_MS: 1000,
  /** マッピングタスクのデフォルト実行間隔（ミリ秒） */
  MAPPING_INTERVAL_MS: 2000,
  /** タスクフローのデフォルト実行間隔（ミリ秒） */
  TASK_FLOW_INTERVAL_MS: 5000,
  /** デフォルトの帯域幅（KB/秒） */
  BANDWIDTH_KBPS: 100,
} as const;
