/**
 * ダッシュボードウィジェットの登録・取得メカニズム
 *
 * 各ウィジェットタイプを登録し、動的に取得できる仕組みを提供。
 * 将来的にウィジェットコンポーネントを追加する際は、このファイルに登録する。
 */
import type { WidgetProps, WidgetRegistration } from './types';

// ウィジェットの登録レジストリ
const widgetRegistry = new Map<string, WidgetRegistration>();

/**
 * ウィジェットを登録する
 * @param registration ウィジェット登録情報
 */
export function registerWidget(registration: WidgetRegistration): void {
  widgetRegistry.set(registration.type, registration);
}

/**
 * ウィジェットコンポーネントを取得する
 * @param type ウィジェットタイプ
 * @returns ウィジェットコンポーネント（未登録の場合はundefined）
 */
export function getWidget(type: string): React.ComponentType<WidgetProps> | undefined {
  const registration = widgetRegistry.get(type);
  return registration?.component;
}

/**
 * ウィジェット登録情報を取得する
 * @param type ウィジェットタイプ
 * @returns 登録情報（未登録の場合はundefined）
 */
export function getWidgetRegistration(type: string): WidgetRegistration | undefined {
  return widgetRegistry.get(type);
}

/**
 * 登録されている全てのウィジェットタイプを取得する
 * @returns 登録済みウィジェットタイプの配列
 */
export function getRegisteredWidgetTypes(): string[] {
  return Array.from(widgetRegistry.keys());
}

/**
 * 全てのウィジェット登録情報を取得する
 * @returns 全ての登録情報
 */
export function getAllWidgets(): WidgetRegistration[] {
  return Array.from(widgetRegistry.values());
}

/**
 * 指定されたウィジェットタイプが登録されているか確認する
 * @param type ウィジェットタイプ
 * @returns 登録されている場合true
 */
export function hasWidget(type: string): boolean {
  return widgetRegistry.has(type);
}

/**
 * ウィジェットのデフォルトタイトルを取得する
 * @param type ウィジェットタイプ
 * @returns デフォルトタイトル（未登録の場合はタイプ名をそのまま返す）
 */
export function getDefaultTitle(type: string): string {
  const registration = widgetRegistry.get(type);
  return registration?.defaultTitle ?? type;
}

/**
 * ウィジェットのデフォルトサイズを取得する
 * @param type ウィジェットタイプ
 * @returns デフォルトサイズ（未登録またはサイズ未指定の場合はデフォルト値）
 */
export function getDefaultSize(type: string): { width: number; height: number } {
  const registration = widgetRegistry.get(type);
  return registration?.defaultSize ?? { width: 300, height: 200 };
}

// 型のエクスポート
export type {
  WidgetProps,
  NumericWidgetProps,
  ChartWidgetProps,
  TableWidgetProps,
  ChartDataPoint,
  TableColumn,
  WidgetRegistration,
} from './types';

// ウィジェットタイプの定数
export const WIDGET_TYPES = {
  RECORD_COUNT: 'recordCount',
  THROUGHPUT: 'throughput',
  ERROR_RATE: 'errorRate',
  PROCESSING_TIME: 'processingTime',
  DATA_QUALITY: 'dataQuality',
  PIPELINE_STATUS: 'pipelineStatus',
  QUERY: 'query',
} as const;

export type WidgetType = (typeof WIDGET_TYPES)[keyof typeof WIDGET_TYPES];

// ウィジェットコンポーネントのインポート
import RecordCountWidget from './RecordCountWidget';
import ThroughputWidget from './ThroughputWidget';
import ErrorRateWidget from './ErrorRateWidget';
import ProcessingTimeWidget from './ProcessingTimeWidget';
import QueryWidget from './QueryWidget';

/**
 * デフォルトのウィジェットを登録する
 * アプリケーション初期化時に呼び出す
 */
export function registerDefaultWidgets(): void {
  // 各コンポーネントを参照することで副作用による登録を実行させる、
  // または明示的にここで登録する。
  
  // 明示的な登録（コンポーネント側での登録と重複しても Map なので上書きされるだけ）
  registerWidget({
    type: 'recordCount',
    component: RecordCountWidget as React.ComponentType<WidgetProps>,
    defaultTitle: 'レコード数',
    defaultSize: { width: 200, height: 120 },
  });
  
  registerWidget({
    type: 'throughput',
    component: ThroughputWidget as React.ComponentType<WidgetProps>,
    defaultTitle: 'スループット',
    defaultSize: { width: 200, height: 120 },
  });
  
  registerWidget({
    type: 'errorRate',
    component: ErrorRateWidget as React.ComponentType<WidgetProps>,
    defaultTitle: 'エラー率',
    defaultSize: { width: 200, height: 120 },
  });
  
  registerWidget({
    type: 'processingTime',
    component: ProcessingTimeWidget as React.ComponentType<WidgetProps>,
    defaultTitle: '処理時間',
    defaultSize: { width: 200, height: 120 },
  });

  if (!hasWidget('query')) {
    registerWidget({
      type: 'query',
      component: (QueryWidget as unknown) as React.ComponentType<WidgetProps>,
      defaultTitle: 'クエリデータ',
      defaultSize: { width: 600, height: 400 },
    });
  }
}
