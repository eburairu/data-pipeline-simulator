/**
 * マッピング設定パネルの登録・取得メカニズム
 *
 * 各変換タイプの設定パネルを登録し、動的に取得できる仕組みを提供。
 * 将来的にConfigPanelコンポーネントを追加する際は、このファイルに登録する。
 */
import React from 'react';
import type { TransformationType } from '../../../lib/MappingTypes';
import type { TransformationConfigProps, ConfigPanelRegistration } from './types';

// 設定パネルの登録レジストリ
const configPanelRegistry = new Map<TransformationType, ConfigPanelRegistration>();

/**
 * 設定パネルを登録する
 * @param registration パネル登録情報
 */
export function registerConfigPanel(registration: ConfigPanelRegistration): void {
  configPanelRegistry.set(registration.type, registration);
}

/**
 * 設定パネルコンポーネントを取得する
 * @param type 変換タイプ
 * @returns 設定パネルコンポーネント（未登録の場合はundefined）
 */
export function getConfigPanel(
  type: TransformationType
): React.ComponentType<TransformationConfigProps> | undefined {
  const registration = configPanelRegistry.get(type);
  return registration?.component;
}

/**
 * 設定パネル登録情報を取得する
 * @param type 変換タイプ
 * @returns 登録情報（未登録の場合はundefined）
 */
export function getConfigPanelRegistration(
  type: TransformationType
): ConfigPanelRegistration | undefined {
  return configPanelRegistry.get(type);
}

/**
 * 登録されている全ての変換タイプを取得する
 * @returns 登録済み変換タイプの配列
 */
export function getRegisteredTypes(): TransformationType[] {
  return Array.from(configPanelRegistry.keys());
}

/**
 * 全ての設定パネル登録情報を取得する
 * @returns 全ての登録情報
 */
export function getAllConfigPanels(): ConfigPanelRegistration[] {
  return Array.from(configPanelRegistry.values());
}

/**
 * 指定された変換タイプが登録されているか確認する
 * @param type 変換タイプ
 * @returns 登録されている場合true
 */
export function hasConfigPanel(type: TransformationType): boolean {
  return configPanelRegistry.has(type);
}

/**
 * 変換タイプの表示名を取得する
 * @param type 変換タイプ
 * @returns 表示名（未登録の場合はタイプ名をそのまま返す）
 */
export function getDisplayName(type: TransformationType): string {
  const registration = configPanelRegistry.get(type);
  return registration?.displayName ?? type;
}

// 型のエクスポート
export type { TransformationConfigProps, ConfigPanelRegistration, ConnectionInfo } from './types';

// ConfigPanelコンポーネントのエクスポート
export { default as SourceConfigPanel } from './SourceConfigPanel';
export { default as TargetConfigPanel } from './TargetConfigPanel';
export { default as FilterConfigPanel } from './FilterConfigPanel';
export { default as ExpressionConfigPanel } from './ExpressionConfigPanel';
export { default as JoinerConfigPanel } from './JoinerConfigPanel';
export { default as AggregatorConfigPanel } from './AggregatorConfigPanel';
export { default as SorterConfigPanel } from './SorterConfigPanel';
export { default as RankConfigPanel } from './RankConfigPanel';
export { default as SequenceConfigPanel } from './SequenceConfigPanel';
export { default as LookupConfigPanel } from './LookupConfigPanel';
export { default as UnionConfigPanel } from './UnionConfigPanel';
export { default as RouterConfigPanel } from './RouterConfigPanel';
export { default as NormalizerConfigPanel } from './NormalizerConfigPanel';
export { default as DeduplicatorConfigPanel } from './DeduplicatorConfigPanel';
export { default as PivotConfigPanel } from './PivotConfigPanel';
export { default as UnpivotConfigPanel } from './UnpivotConfigPanel';
export { default as SQLConfigPanel } from './SQLConfigPanel';
export { default as WebServiceConfigPanel } from './WebServiceConfigPanel';
export { default as HierarchyParserConfigPanel } from './HierarchyParserConfigPanel';
export { default as CleansingConfigPanel } from './CleansingConfigPanel';
export { default as UpdateStrategyConfigPanel } from './UpdateStrategyConfigPanel';

// nodeTypes, edgeTypes のエクスポート
export { nodeTypes, edgeTypes } from './DesignerNode';

// デフォルトのパネル登録（初期化時に呼び出す）
import SourceConfigPanel from './SourceConfigPanel';
import TargetConfigPanel from './TargetConfigPanel';
import FilterConfigPanel from './FilterConfigPanel';
import ExpressionConfigPanel from './ExpressionConfigPanel';
import JoinerConfigPanel from './JoinerConfigPanel';
import AggregatorConfigPanel from './AggregatorConfigPanel';
import SorterConfigPanel from './SorterConfigPanel';
import RankConfigPanel from './RankConfigPanel';
import SequenceConfigPanel from './SequenceConfigPanel';
import LookupConfigPanel from './LookupConfigPanel';
import UnionConfigPanel from './UnionConfigPanel';
import RouterConfigPanel from './RouterConfigPanel';
import NormalizerConfigPanel from './NormalizerConfigPanel';
import DeduplicatorConfigPanel from './DeduplicatorConfigPanel';
import PivotConfigPanel from './PivotConfigPanel';
import UnpivotConfigPanel from './UnpivotConfigPanel';
import SQLConfigPanel from './SQLConfigPanel';
import WebServiceConfigPanel from './WebServiceConfigPanel';
import HierarchyParserConfigPanel from './HierarchyParserConfigPanel';
import CleansingConfigPanel from './CleansingConfigPanel';
import UpdateStrategyConfigPanel from './UpdateStrategyConfigPanel';

/**
 * デフォルトのConfigPanelを登録する
 * アプリケーション初期化時に呼び出すことで、5つの主要パネルを登録
 */
export function registerDefaultConfigPanels(): void {
  registerConfigPanel({
    type: 'source',
    component: SourceConfigPanel,
    displayName: 'ソース',
  });
  registerConfigPanel({
    type: 'target',
    component: TargetConfigPanel,
    displayName: 'ターゲット',
  });
  registerConfigPanel({
    type: 'filter',
    component: FilterConfigPanel,
    displayName: 'フィルター',
  });
  registerConfigPanel({
    type: 'expression',
    component: ExpressionConfigPanel,
    displayName: '式',
  });
  registerConfigPanel({
    type: 'joiner',
    component: JoinerConfigPanel,
    displayName: '結合',
  });
  registerConfigPanel({
    type: 'aggregator',
    component: AggregatorConfigPanel,
    displayName: '集計',
  });
  registerConfigPanel({
    type: 'sorter',
    component: SorterConfigPanel,
    displayName: 'ソート',
  });
  registerConfigPanel({
    type: 'rank',
    component: RankConfigPanel,
    displayName: 'ランク',
  });
  registerConfigPanel({
    type: 'sequence',
    component: SequenceConfigPanel,
    displayName: 'シーケンス',
  });
  registerConfigPanel({
    type: 'lookup',
    component: LookupConfigPanel,
    displayName: 'ルックアップ',
  });
  registerConfigPanel({
    type: 'union',
    component: UnionConfigPanel,
    displayName: 'ユニオン',
  });
  registerConfigPanel({
    type: 'router',
    component: RouterConfigPanel,
    displayName: 'ルーター',
  });
  registerConfigPanel({
    type: 'normalizer',
    component: NormalizerConfigPanel,
    displayName: '正規化',
  });
  registerConfigPanel({
    type: 'deduplicator',
    component: DeduplicatorConfigPanel,
    displayName: '重複排除',
  });
  registerConfigPanel({
    type: 'pivot',
    component: PivotConfigPanel,
    displayName: 'ピボット',
  });
  registerConfigPanel({
    type: 'unpivot',
    component: UnpivotConfigPanel,
    displayName: 'アンピボット',
  });
  registerConfigPanel({
    type: 'sql',
    component: SQLConfigPanel,
    displayName: 'SQL',
  });
  registerConfigPanel({
    type: 'webService',
    component: WebServiceConfigPanel,
    displayName: 'Webサービス',
  });
  registerConfigPanel({
    type: 'hierarchyParser',
    component: HierarchyParserConfigPanel,
    displayName: '階層パーサー',
  });
  registerConfigPanel({
    type: 'cleansing',
    component: CleansingConfigPanel,
    displayName: 'クレンジング',
  });
  registerConfigPanel({
    type: 'updateStrategy',
    component: UpdateStrategyConfigPanel,
    displayName: '更新戦略',
  });
}

// 初期化時にデフォルトの設定パネルを登録
registerDefaultConfigPanels();

// 変換タイプと日本語表示名のマッピング（デフォルト値）
export const TRANSFORMATION_DISPLAY_NAMES: Record<TransformationType, string> = {
  source: 'ソース',
  target: 'ターゲット',
  filter: 'フィルター',
  expression: '式',
  aggregator: '集計',
  validator: '検証',
  joiner: '結合',
  lookup: 'ルックアップ',
  router: 'ルーター',
  sorter: 'ソート',
  union: 'ユニオン',
  normalizer: '正規化',
  rank: 'ランク',
  sequence: 'シーケンス',
  updateStrategy: '更新戦略',
  cleansing: 'クレンジング',
  deduplicator: '重複排除',
  pivot: 'ピボット',
  unpivot: 'アンピボット',
  sql: 'SQL',
  webService: 'Webサービス',
  hierarchyParser: '階層パーサー',
};
