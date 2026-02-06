/**
 * MappingDesigner用の定数・ファクトリ関数
 */
import {
  Search, GitFork, ArrowUpDown, Merge, Repeat, Award, Hash, Flag,
  Sparkles, Copy, Table, Columns, Database, Globe, FileJson, CheckSquare
} from 'lucide-react';
import type { TransformationType, Transformation } from '../../../lib/MappingTypes';
import type { LucideIcon } from 'lucide-react';

/** 変換タイプのUI定義 */
export interface TransformationTypeInfo {
  type: string;
  label: string;
  short: string | null;
  bg: string;
  border: string;
  icon: LucideIcon | null;
}

/** 全変換タイプのUI定義リスト */
export const TRANSFORMATION_TYPES: TransformationTypeInfo[] = [
  { type: 'source', label: 'Source', short: 'SRC', bg: 'bg-green-100', border: 'border-green-500', icon: null },
  { type: 'target', label: 'Target', short: 'TGT', bg: 'bg-red-100', border: 'border-red-500', icon: null },
  { type: 'filter', label: 'Filter', short: 'FLT', bg: 'bg-yellow-100', border: 'border-yellow-500', icon: null },
  { type: 'expression', label: 'Expression', short: 'EXP', bg: 'bg-purple-100', border: 'border-purple-500', icon: null },
  { type: 'aggregator', label: 'Aggregator', short: 'AGG', bg: 'bg-orange-100', border: 'border-orange-500', icon: null },
  { type: 'lookup', label: 'Lookup', short: null, bg: 'bg-cyan-100', border: 'border-cyan-500', icon: Search },
  { type: 'joiner', label: 'Joiner', short: 'JOIN', bg: 'bg-blue-100', border: 'border-blue-500', icon: null },
  { type: 'union', label: 'Union', short: null, bg: 'bg-indigo-100', border: 'border-indigo-500', icon: Merge },
  { type: 'router', label: 'Router', short: null, bg: 'bg-lime-100', border: 'border-lime-500', icon: GitFork },
  { type: 'sorter', label: 'Sorter', short: null, bg: 'bg-amber-100', border: 'border-amber-500', icon: ArrowUpDown },
  { type: 'normalizer', label: 'Normalizer', short: null, bg: 'bg-violet-100', border: 'border-violet-500', icon: Repeat },
  { type: 'rank', label: 'Rank', short: null, bg: 'bg-rose-100', border: 'border-rose-500', icon: Award },
  { type: 'sequence', label: 'Sequence', short: null, bg: 'bg-sky-100', border: 'border-sky-500', icon: Hash },
  { type: 'updateStrategy', label: 'Update Strategy', short: null, bg: 'bg-slate-100', border: 'border-slate-500', icon: Flag },
  { type: 'validator', label: 'Validator', short: null, bg: 'bg-pink-100', border: 'border-pink-500', icon: CheckSquare },
  { type: 'cleansing', label: 'Cleansing', short: null, bg: 'bg-teal-100', border: 'border-teal-500', icon: Sparkles },
  { type: 'deduplicator', label: 'Deduplicator', short: null, bg: 'bg-orange-100', border: 'border-orange-500', icon: Copy },
  { type: 'pivot', label: 'Pivot', short: null, bg: 'bg-purple-100', border: 'border-purple-500', icon: Table },
  { type: 'unpivot', label: 'Unpivot', short: null, bg: 'bg-fuchsia-100', border: 'border-fuchsia-500', icon: Columns },
  { type: 'webService', label: 'Web Service', short: 'WS', bg: 'bg-indigo-100', border: 'border-indigo-500', icon: Globe },
  { type: 'hierarchyParser', label: 'Hierarchy Parser', short: 'HP', bg: 'bg-green-100', border: 'border-green-500', icon: FileJson },
  { type: 'sql', label: 'SQL', short: null, bg: 'bg-slate-100', border: 'border-slate-500', icon: Database },
];

/** 変換タイプ別のデフォルト設定 */
const DEFAULT_CONFIGS: Record<string, Record<string, unknown>> = {
  source: { connectionId: '' },
  target: { connectionId: '' },
  filter: { condition: 'true' },
  expression: { fields: [] },
  aggregator: { groupBy: [], aggregates: [] },
  validator: { rules: [], errorBehavior: 'skip' },
  joiner: { joinType: 'inner', masterKeys: [], detailKeys: [] },
  lookup: { connectionId: '', lookupKeys: [], referenceKeys: [], returnFields: [], defaultValue: '' },
  router: { routes: [], defaultGroup: 'default' },
  sorter: { sortFields: [] },
  union: {},
  normalizer: { arrayField: '', outputFields: [], keepOriginalFields: true },
  rank: { partitionBy: [], orderBy: [], rankField: 'rank', rankType: 'rowNumber' },
  sequence: { sequenceField: 'seq', startValue: 1, incrementBy: 1 },
  updateStrategy: { strategyField: '_strategy', defaultStrategy: 'insert', conditions: [] },
  cleansing: { rules: [] },
  deduplicator: { keys: [], caseInsensitive: false },
  pivot: { groupByFields: [], pivotField: '', valueField: '' },
  unpivot: { fieldsToUnpivot: [], newHeaderFieldName: 'Metric', newValueFieldName: 'Value' },
  sql: { sqlQuery: '', mode: 'query' },
  webService: { url: 'http://api.example.com/data', method: 'GET', headers: [], responseMap: [] },
  hierarchyParser: { inputField: '', outputFields: [] },
};

/**
 * 指定された変換タイプのデフォルト設定でTransformationを生成する
 */
export function createDefaultTransformation(
  type: TransformationType,
  id: string,
  index: number
): Transformation | null {
  const config = DEFAULT_CONFIGS[type];
  if (!config) return null;

  return {
    id,
    type,
    name: `${type}_${index}`,
    position: { x: 0, y: 0 },
    config: { ...config },
  } as Transformation;
}
