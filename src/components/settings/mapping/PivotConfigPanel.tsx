/**
 * Pivot変換の設定パネル
 * 行データを列に変換（ピボット）する設定を行う
 */
import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { TransformationConfigProps } from './types';
import type { PivotConfig } from '../../../lib/MappingTypes';

const PivotConfigPanel: React.FC<TransformationConfigProps> = ({
  config,
  onChange,
  readOnly = false,
}) => {
  const pivotConfig = config as unknown as PivotConfig;
  const groupByFields = pivotConfig.groupByFields || [];
  const pivotField = pivotConfig.pivotField || '';
  const valueField = pivotConfig.valueField || '';
  const aggregates = pivotConfig.aggregates || [];

  /** グループフィールドを追加 */
  const handleAddGroupByField = () => {
    onChange({ ...config, groupByFields: [...groupByFields, ''] });
  };

  /** グループフィールドを削除 */
  const handleRemoveGroupByField = (index: number) => {
    const newGroupByFields = groupByFields.filter((_, i) => i !== index);
    onChange({ ...config, groupByFields: newGroupByFields });
  };

  /** グループフィールドを更新 */
  const handleGroupByFieldChange = (index: number, value: string) => {
    const newGroupByFields = [...groupByFields];
    newGroupByFields[index] = value;
    onChange({ ...config, groupByFields: newGroupByFields });
  };

  return (
    <div className="space-y-4">
      {/* グループ化フィールド */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs text-gray-500 font-medium">
            グループ化フィールド（行として残る）
          </label>
          {!readOnly && (
            <button
              type="button"
              onClick={handleAddGroupByField}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Plus size={12} />
              追加
            </button>
          )}
        </div>
        {groupByFields.length === 0 ? (
          <p className="text-xs text-gray-400">
            グループ化するフィールドを追加してください
          </p>
        ) : (
          <div className="space-y-2">
            {groupByFields.map((field, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  disabled={readOnly}
                  className="flex-1 border rounded p-1 text-sm disabled:bg-gray-100"
                  placeholder="フィールド名"
                  value={field}
                  onChange={(e) => handleGroupByFieldChange(index, e.target.value)}
                />
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemoveGroupByField(index)}
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

      {/* ピボットフィールド */}
      <div>
        <label className="block text-xs text-gray-500 font-medium mb-1">
          ピボットフィールド（列名になる）
        </label>
        <input
          disabled={readOnly}
          className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
          placeholder="例: month"
          value={pivotField}
          onChange={(e) => onChange({ ...config, pivotField: e.target.value })}
        />
        <p className="text-xs text-gray-400 mt-1">
          このフィールドの値が新しい列名になります
        </p>
      </div>

      {/* 値フィールド */}
      <div>
        <label className="block text-xs text-gray-500 font-medium mb-1">
          値フィールド（セルの値になる）
        </label>
        <input
          disabled={readOnly}
          className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
          placeholder="例: amount"
          value={valueField}
          onChange={(e) => onChange({ ...config, valueField: e.target.value })}
        />
        <p className="text-xs text-gray-400 mt-1">
          ピボット後のセルに入る値のフィールド
        </p>
      </div>

      {/* 集計関数（オプション） */}
      <div>
        <label className="block text-xs text-gray-500 font-medium mb-1">
          集計関数（複数の値がある場合）
        </label>
        <select
          disabled={readOnly}
          className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
          value={aggregates[0] || ''}
          onChange={(e) =>
            onChange({
              ...config,
              aggregates: e.target.value ? [e.target.value] : [],
            })
          }
        >
          <option value="">なし（最初の値を使用）</option>
          <option value="sum">SUM（合計）</option>
          <option value="count">COUNT（件数）</option>
          <option value="avg">AVG（平均）</option>
          <option value="min">MIN（最小）</option>
          <option value="max">MAX（最大）</option>
        </select>
      </div>

      {/* 説明 */}
      <div className="border rounded p-2 bg-blue-50 text-xs text-blue-700">
        <p className="font-medium mb-1">例：</p>
        <p>入力:</p>
        <p className="ml-2">{`{ category: "A", month: "Jan", amount: 100 }`}</p>
        <p className="ml-2">{`{ category: "A", month: "Feb", amount: 200 }`}</p>
        <p>出力:</p>
        <p className="ml-2">{`{ category: "A", Jan: 100, Feb: 200 }`}</p>
      </div>
    </div>
  );
};

export default PivotConfigPanel;
