/**
 * Sorter変換の設定パネル
 * データのソート順序を設定する
 */
import React from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import type { TransformationConfigProps } from './types';
import type { SorterConfig, SortField } from '../../../lib/MappingTypes';

const SorterConfigPanel: React.FC<TransformationConfigProps> = ({
  config,
  onChange,
  readOnly = false,
}) => {
  const sorterConfig = config as unknown as SorterConfig;
  const sortFields = sorterConfig.sortFields || [];

  /** ソートフィールドを追加 */
  const handleAddSortField = () => {
    const newSortField: SortField = {
      field: '',
      direction: 'asc',
    };
    onChange({ ...config, sortFields: [...sortFields, newSortField] });
  };

  /** ソートフィールドを削除 */
  const handleRemoveSortField = (index: number) => {
    const newSortFields = sortFields.filter((_, i) => i !== index);
    onChange({ ...config, sortFields: newSortFields });
  };

  /** ソートフィールドを更新 */
  const handleSortFieldChange = (
    index: number,
    field: keyof SortField,
    value: string
  ) => {
    const newSortFields = [...sortFields];
    newSortFields[index] = { ...newSortFields[index], [field]: value };
    onChange({ ...config, sortFields: newSortFields });
  };

  /** ソート方向を切り替え */
  const toggleDirection = (index: number) => {
    const newSortFields = [...sortFields];
    newSortFields[index] = {
      ...newSortFields[index],
      direction: newSortFields[index].direction === 'asc' ? 'desc' : 'asc',
    };
    onChange({ ...config, sortFields: newSortFields });
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs text-gray-500 font-medium">
            ソートフィールド
          </label>
          {!readOnly && (
            <button
              type="button"
              onClick={handleAddSortField}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Plus size={12} />
              追加
            </button>
          )}
        </div>
        {sortFields.length === 0 ? (
          <p className="text-xs text-gray-400">
            ソートフィールドを追加してください
          </p>
        ) : (
          <div className="space-y-2">
            {sortFields.map((sortField, index) => (
              <div
                key={index}
                className="flex items-center gap-2 border rounded p-2 bg-gray-50"
              >
                <span className="text-xs text-gray-400 w-6">{index + 1}.</span>
                <input
                  disabled={readOnly}
                  className="flex-1 border rounded p-1 text-sm disabled:bg-gray-100"
                  placeholder="フィールド名"
                  value={sortField.field}
                  onChange={(e) =>
                    handleSortFieldChange(index, 'field', e.target.value)
                  }
                />
                {!readOnly ? (
                  <button
                    type="button"
                    onClick={() => toggleDirection(index)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                      sortField.direction === 'asc'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {sortField.direction === 'asc' ? (
                      <>
                        <ArrowUp size={12} />
                        昇順
                      </>
                    ) : (
                      <>
                        <ArrowDown size={12} />
                        降順
                      </>
                    )}
                  </button>
                ) : (
                  <span
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                      sortField.direction === 'asc'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {sortField.direction === 'asc' ? (
                      <>
                        <ArrowUp size={12} />
                        昇順
                      </>
                    ) : (
                      <>
                        <ArrowDown size={12} />
                        降順
                      </>
                    )}
                  </span>
                )}
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSortField(index)}
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

      <p className="text-xs text-gray-400 mt-2">
        複数のフィールドを指定した場合、上から順に優先度が高くなります。
      </p>
    </div>
  );
};

export default SorterConfigPanel;
