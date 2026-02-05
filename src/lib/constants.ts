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
