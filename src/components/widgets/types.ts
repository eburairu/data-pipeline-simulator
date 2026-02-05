/**
 * ダッシュボードウィジェット用の型定義
 */

/**
 * ウィジェットの基本プロパティ
 */
export interface WidgetProps {
  /** ウィジェットID */
  id: string;
  /** ウィジェットタイトル */
  title: string;
  /** カスタムクラス名 */
  className?: string;
  /** 読み込み中状態 */
  loading?: boolean;
  /** エラー状態 */
  error?: string | null;
}

/**
 * 数値表示ウィジェットのプロパティ
 */
export interface NumericWidgetProps extends WidgetProps {
  /** 表示する値 */
  value: number;
  /** 単位（例: "件", "ms", "%"） */
  unit?: string;
  /** 前回からの変化量 */
  change?: number;
  /** 変化の方向（増加が良いか悪いか） */
  changeDirection?: 'positive' | 'negative' | 'neutral';
  /** フォーマット関数 */
  formatter?: (value: number) => string;
}

/**
 * チャートウィジェットのプロパティ
 */
export interface ChartWidgetProps extends WidgetProps {
  /** チャートデータ */
  data: ChartDataPoint[];
  /** チャートタイプ */
  chartType: 'line' | 'bar' | 'area' | 'pie';
  /** X軸のキー */
  xKey: string;
  /** Y軸のキー（複数可） */
  yKeys: string[];
  /** 凡例の表示 */
  showLegend?: boolean;
  /** グリッドの表示 */
  showGrid?: boolean;
}

/**
 * チャートデータポイント
 */
export interface ChartDataPoint {
  [key: string]: string | number;
}

/**
 * テーブルウィジェットのプロパティ
 */
export interface TableWidgetProps extends WidgetProps {
  /** テーブルデータ */
  data: Record<string, unknown>[];
  /** カラム定義 */
  columns: TableColumn[];
  /** ソート可能か */
  sortable?: boolean;
  /** ページネーション */
  pagination?: {
    pageSize: number;
    currentPage: number;
    totalItems: number;
  };
}

/**
 * テーブルカラム定義
 */
export interface TableColumn {
  /** カラムキー */
  key: string;
  /** 表示ヘッダー */
  header: string;
  /** 幅 */
  width?: string | number;
  /** 整列 */
  align?: 'left' | 'center' | 'right';
  /** カスタムレンダラー */
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

/**
 * ウィジェット登録用の型
 */
export interface WidgetRegistration {
  /** ウィジェットタイプ */
  type: string;
  /** ウィジェットコンポーネント */
  component: React.ComponentType<WidgetProps>;
  /** デフォルトタイトル */
  defaultTitle: string;
  /** デフォルトサイズ */
  defaultSize?: { width: number; height: number };
}
