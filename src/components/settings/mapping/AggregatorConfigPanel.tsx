/**
 * Aggregator変換の設定パネル
 * データのグループ化と集計処理を設定する
 */
import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { TransformationConfigProps } from './types';
import type { AggregatorConfig, AggregateField } from '../../../lib/MappingTypes';

/** 集計関数の選択肢 */
const AGGREGATE_FUNCTIONS: { value: AggregateField['function']; label: string }[] = [
  { value: 'sum', label: 'SUM（合計）' },
  { value: 'count', label: 'COUNT（件数）' },
  { value: 'avg', label: 'AVG（平均）' },
  { value: 'min', label: 'MIN（最小）' },
  { value: 'max', label: 'MAX（最大）' },
];

const AggregatorConfigPanel: React.FC<TransformationConfigProps> = ({
  config,
  onChange,
  readOnly = false,
}) => {
  const aggregatorConfig = config as unknown as AggregatorConfig;
  const groupBy = aggregatorConfig.groupBy || [];
  const aggregates = aggregatorConfig.aggregates || [];

  /** グループ化フィールドを追加 */
  const handleAddGroupBy = () => {
    onChange({ ...config, groupBy: [...groupBy, ''] });
  };

  /** グループ化フィールドを削除 */
  const handleRemoveGroupBy = (index: number) => {
    const newGroupBy = groupBy.filter((_, i) => i !== index);
    onChange({ ...config, groupBy: newGroupBy });
  };

  /** グループ化フィールドを更新 */
  const handleGroupByChange = (index: number, value: string) => {
    const newGroupBy = [...groupBy];
    newGroupBy[index] = value;
    onChange({ ...config, groupBy: newGroupBy });
  };

  /** 集計フィールドを追加 */
  const handleAddAggregate = () => {
    const newAggregate: AggregateField = {
      name: '',
      function: 'sum',
      field: '',
    };
    onChange({ ...config, aggregates: [...aggregates, newAggregate] });
  };

  /** 集計フィールドを削除 */
  const handleRemoveAggregate = (index: number) => {
    const newAggregates = aggregates.filter((_, i) => i !== index);
    onChange({ ...config, aggregates: newAggregates });
  };

  /** 集計フィールドを更新 */
  const handleAggregateChange = (
    index: number,
    field: keyof AggregateField,
    value: string
  ) => {
    const newAggregates = [...aggregates];
    newAggregates[index] = { ...newAggregates[index], [field]: value };
    onChange({ ...config, aggregates: newAggregates });
  };

  return (
    <div className="space-y-4">
      {/* グループ化フィールド */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs text-gray-500 font-medium">
            グループ化フィールド
          </label>
          {!readOnly && (
            <button
              type="button"
              onClick={handleAddGroupBy}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Plus size={12} />
              追加
            </button>
          )}
        </div>
        {groupBy.length === 0 ? (
          <p className="text-xs text-gray-400">
            グループ化フィールドが未設定です（全レコードを1グループとして集計）
          </p>
        ) : (
          <div className="space-y-2">
            {groupBy.map((field, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  disabled={readOnly}
                  className="flex-1 border rounded p-1 text-sm disabled:bg-gray-100"
                  placeholder="フィールド名"
                  value={field}
                  onChange={(e) => handleGroupByChange(index, e.target.value)}
                />
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemoveGroupBy(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 集計フィールド */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs text-gray-500 font-medium">
            集計フィールド
          </label>
          {!readOnly && (
            <button
              type="button"
              onClick={handleAddAggregate}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Plus size={12} />
              追加
            </button>
          )}
        </div>
        {aggregates.length === 0 ? (
          <p className="text-xs text-gray-400">集計フィールドを追加してください</p>
        ) : (
          <div className="space-y-3">
            {aggregates.map((aggregate, index) => (
              <div
                key={index}
                className="border rounded p-2 bg-gray-50 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">集計 #{index + 1}</span>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAggregate(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-gray-400">出力名</label>
                    <input
                      disabled={readOnly}
                      className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                      placeholder="例: total_amount"
                      value={aggregate.name}
                      onChange={(e) =>
                        handleAggregateChange(index, 'name', e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400">関数</label>
                    <select
                      disabled={readOnly}
                      className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                      value={aggregate.function}
                      onChange={(e) =>
                        handleAggregateChange(index, 'function', e.target.value)
                      }
                    >
                      {AGGREGATE_FUNCTIONS.map((fn) => (
                        <option key={fn.value} value={fn.value}>
                          {fn.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400">対象フィールド</label>
                    <input
                      disabled={readOnly}
                      className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                      placeholder="例: amount"
                      value={aggregate.field}
                      onChange={(e) =>
                        handleAggregateChange(index, 'field', e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-2">
        グループ化フィールドでレコードをグループ化し、各グループに対して集計を実行します。
      </p>
    </div>
  );
};

export default AggregatorConfigPanel;
