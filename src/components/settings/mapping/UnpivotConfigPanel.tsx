/**
 * Unpivot変換の設定パネル
 * 列データを行に変換（アンピボット）する設定を行う
 */
import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { TransformationConfigProps } from './types';
import type { UnpivotConfig } from '../../../lib/MappingTypes';

const UnpivotConfigPanel: React.FC<TransformationConfigProps> = ({
  config,
  onChange,
  readOnly = false,
}) => {
  const unpivotConfig = config as unknown as UnpivotConfig;
  const fieldsToUnpivot = unpivotConfig.fieldsToUnpivot || [];
  const newHeaderFieldName = unpivotConfig.newHeaderFieldName || '';
  const newValueFieldName = unpivotConfig.newValueFieldName || '';

  /** アンピボットフィールドを追加 */
  const handleAddField = () => {
    onChange({ ...config, fieldsToUnpivot: [...fieldsToUnpivot, ''] });
  };

  /** アンピボットフィールドを削除 */
  const handleRemoveField = (index: number) => {
    const newFields = fieldsToUnpivot.filter((_, i) => i !== index);
    onChange({ ...config, fieldsToUnpivot: newFields });
  };

  /** アンピボットフィールドを更新 */
  const handleFieldChange = (index: number, value: string) => {
    const newFields = [...fieldsToUnpivot];
    newFields[index] = value;
    onChange({ ...config, fieldsToUnpivot: newFields });
  };

  return (
    <div className="space-y-4">
      {/* アンピボット対象フィールド */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs text-gray-500 font-medium">
            行に変換するフィールド（列）
          </label>
          {!readOnly && (
            <button
              type="button"
              onClick={handleAddField}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Plus size={12} />
              追加
            </button>
          )}
        </div>
        {fieldsToUnpivot.length === 0 ? (
          <p className="text-xs text-gray-400">
            行に変換するフィールドを追加してください
          </p>
        ) : (
          <div className="space-y-2">
            {fieldsToUnpivot.map((field, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  disabled={readOnly}
                  className="flex-1 border rounded p-1 text-sm disabled:bg-gray-100"
                  placeholder="フィールド名"
                  value={field}
                  onChange={(e) => handleFieldChange(index, e.target.value)}
                />
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemoveField(index)}
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

      {/* 新しいヘッダーフィールド名 */}
      <div>
        <label className="block text-xs text-gray-500 font-medium mb-1">
          新しいヘッダーフィールド名
        </label>
        <input
          disabled={readOnly}
          className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
          placeholder="例: attribute"
          value={newHeaderFieldName}
          onChange={(e) =>
            onChange({ ...config, newHeaderFieldName: e.target.value })
          }
        />
        <p className="text-xs text-gray-400 mt-1">
          元の列名が格納されるフィールド
        </p>
      </div>

      {/* 新しい値フィールド名 */}
      <div>
        <label className="block text-xs text-gray-500 font-medium mb-1">
          新しい値フィールド名
        </label>
        <input
          disabled={readOnly}
          className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
          placeholder="例: value"
          value={newValueFieldName}
          onChange={(e) =>
            onChange({ ...config, newValueFieldName: e.target.value })
          }
        />
        <p className="text-xs text-gray-400 mt-1">
          元の列の値が格納されるフィールド
        </p>
      </div>

      {/* 説明 */}
      <div className="border rounded p-2 bg-blue-50 text-xs text-blue-700">
        <p className="font-medium mb-1">例：</p>
        <p>入力:</p>
        <p className="ml-2">{`{ id: 1, Jan: 100, Feb: 200, Mar: 300 }`}</p>
        <p>出力（Jan, Feb, Mar をアンピボット）:</p>
        <p className="ml-2">{`{ id: 1, month: "Jan", amount: 100 }`}</p>
        <p className="ml-2">{`{ id: 1, month: "Feb", amount: 200 }`}</p>
        <p className="ml-2">{`{ id: 1, month: "Mar", amount: 300 }`}</p>
      </div>
    </div>
  );
};

export default UnpivotConfigPanel;
