/**
 * Deduplicator変換の設定パネル
 * 重複レコードを排除する設定を行う
 */
import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { TransformationConfigProps } from './types';
import type { DeduplicatorConfig } from '../../../lib/MappingTypes';

const DeduplicatorConfigPanel: React.FC<TransformationConfigProps> = ({
  config,
  onChange,
  readOnly = false,
}) => {
  const deduplicatorConfig = config as unknown as DeduplicatorConfig;
  const keys = deduplicatorConfig.keys || [];
  const caseInsensitive = deduplicatorConfig.caseInsensitive ?? false;

  /** キーを追加 */
  const handleAddKey = () => {
    onChange({ ...config, keys: [...keys, ''] });
  };

  /** キーを削除 */
  const handleRemoveKey = (index: number) => {
    const newKeys = keys.filter((_, i) => i !== index);
    onChange({ ...config, keys: newKeys });
  };

  /** キーを更新 */
  const handleKeyChange = (index: number, value: string) => {
    const newKeys = [...keys];
    newKeys[index] = value;
    onChange({ ...config, keys: newKeys });
  };

  return (
    <div className="space-y-4">
      {/* 重複判定キー */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs text-gray-500 font-medium">
            重複判定キー
          </label>
          {!readOnly && (
            <button
              type="button"
              onClick={handleAddKey}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Plus size={12} />
              追加
            </button>
          )}
        </div>
        {keys.length === 0 ? (
          <p className="text-xs text-gray-400">
            重複判定に使用するフィールドを追加してください
          </p>
        ) : (
          <div className="space-y-2">
            {keys.map((key, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  disabled={readOnly}
                  className="flex-1 border rounded p-1 text-sm disabled:bg-gray-100"
                  placeholder="フィールド名"
                  value={key}
                  onChange={(e) => handleKeyChange(index, e.target.value)}
                />
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemoveKey(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-400 mt-1">
          指定したフィールドの組み合わせが同じレコードを重複とみなします
        </p>
      </div>

      {/* 大文字小文字を区別しない */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="caseInsensitive"
          disabled={readOnly}
          checked={caseInsensitive}
          onChange={(e) =>
            onChange({ ...config, caseInsensitive: e.target.checked })
          }
          className="rounded"
        />
        <label htmlFor="caseInsensitive" className="text-xs text-gray-600">
          大文字/小文字を区別しない
        </label>
      </div>

      {/* 説明 */}
      <div className="border rounded p-2 bg-gray-50 text-xs text-gray-500">
        <p>• 重複があった場合、最初に出現したレコードが保持されます</p>
        <p>• キーを指定しない場合、すべてのフィールドで比較されます</p>
      </div>
    </div>
  );
};

export default DeduplicatorConfigPanel;
