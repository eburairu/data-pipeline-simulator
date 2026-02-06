/**
 * Rank変換の設定パネル
 * データにランク（順位）を付与する設定を行う
 */
import React from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import type { TransformationConfigProps } from './types';
import type { RankConfig } from '../../../lib/MappingTypes';

/** ランクタイプの選択肢 */
const RANK_TYPES: { value: RankConfig['rankType']; label: string; description: string }[] = [
  { value: 'rank', label: 'RANK', description: '同順位がある場合、次の順位をスキップ（1,2,2,4）' },
  { value: 'denseRank', label: 'DENSE_RANK', description: '同順位があっても連続（1,2,2,3）' },
  { value: 'rowNumber', label: 'ROW_NUMBER', description: '同値でも連番（1,2,3,4）' },
];

const RankConfigPanel: React.FC<TransformationConfigProps> = ({
  config,
  onChange,
  readOnly = false,
}) => {
  const rankConfig = config as unknown as RankConfig;
  const partitionBy = rankConfig.partitionBy || [];
  const orderBy = rankConfig.orderBy || [];
  const rankField = rankConfig.rankField || '';
  const rankType = rankConfig.rankType || 'rank';

  /** パーティションフィールドを追加 */
  const handleAddPartition = () => {
    onChange({ ...config, partitionBy: [...partitionBy, ''] });
  };

  /** パーティションフィールドを削除 */
  const handleRemovePartition = (index: number) => {
    const newPartitionBy = partitionBy.filter((_, i) => i !== index);
    onChange({ ...config, partitionBy: newPartitionBy });
  };

  /** パーティションフィールドを更新 */
  const handlePartitionChange = (index: number, value: string) => {
    const newPartitionBy = [...partitionBy];
    newPartitionBy[index] = value;
    onChange({ ...config, partitionBy: newPartitionBy });
  };

  /** ソートフィールドを追加 */
  const handleAddOrderBy = () => {
    onChange({
      ...config,
      orderBy: [...orderBy, { field: '', direction: 'asc' as const }],
    });
  };

  /** ソートフィールドを削除 */
  const handleRemoveOrderBy = (index: number) => {
    const newOrderBy = orderBy.filter((_, i) => i !== index);
    onChange({ ...config, orderBy: newOrderBy });
  };

  /** ソートフィールドを更新 */
  const handleOrderByChange = (
    index: number,
    field: 'field' | 'direction',
    value: string
  ) => {
    const newOrderBy = [...orderBy];
    newOrderBy[index] = { ...newOrderBy[index], [field]: value };
    onChange({ ...config, orderBy: newOrderBy });
  };

  /** ソート方向を切り替え */
  const toggleDirection = (index: number) => {
    const newOrderBy = [...orderBy];
    newOrderBy[index] = {
      ...newOrderBy[index],
      direction: newOrderBy[index].direction === 'asc' ? 'desc' : 'asc',
    };
    onChange({ ...config, orderBy: newOrderBy });
  };

  return (
    <div className="space-y-4">
      {/* ランク出力フィールド */}
      <div>
        <label className="block text-xs text-gray-500 font-medium mb-1">
          ランク出力フィールド
        </label>
        <input
          disabled={readOnly}
          className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
          placeholder="例: rank"
          value={rankField}
          onChange={(e) => onChange({ ...config, rankField: e.target.value })}
        />
      </div>

      {/* ランクタイプ */}
      <div>
        <label className="block text-xs text-gray-500 font-medium mb-1">
          ランクタイプ
        </label>
        <select
          disabled={readOnly}
          className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
          value={rankType}
          onChange={(e) => onChange({ ...config, rankType: e.target.value })}
        >
          {RANK_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-1">
          {RANK_TYPES.find((t) => t.value === rankType)?.description}
        </p>
      </div>

      {/* パーティションフィールド */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs text-gray-500 font-medium">
            パーティション（グループ化）
          </label>
          {!readOnly && (
            <button
              type="button"
              onClick={handleAddPartition}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Plus size={12} />
              追加
            </button>
          )}
        </div>
        {partitionBy.length === 0 ? (
          <p className="text-xs text-gray-400">
            パーティションなし（全レコードで順位付け）
          </p>
        ) : (
          <div className="space-y-2">
            {partitionBy.map((field, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  disabled={readOnly}
                  className="flex-1 border rounded p-1 text-sm disabled:bg-gray-100"
                  placeholder="フィールド名"
                  value={field}
                  onChange={(e) => handlePartitionChange(index, e.target.value)}
                />
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemovePartition(index)}
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

      {/* ソートフィールド */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs text-gray-500 font-medium">
            ソート順序（順位付けの基準）
          </label>
          {!readOnly && (
            <button
              type="button"
              onClick={handleAddOrderBy}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Plus size={12} />
              追加
            </button>
          )}
        </div>
        {orderBy.length === 0 ? (
          <p className="text-xs text-gray-400">
            ソートフィールドを追加してください（必須）
          </p>
        ) : (
          <div className="space-y-2">
            {orderBy.map((order, index) => (
              <div
                key={index}
                className="flex items-center gap-2 border rounded p-2 bg-gray-50"
              >
                <span className="text-xs text-gray-400 w-6">{index + 1}.</span>
                <input
                  disabled={readOnly}
                  className="flex-1 border rounded p-1 text-sm disabled:bg-gray-100"
                  placeholder="フィールド名"
                  value={order.field}
                  onChange={(e) =>
                    handleOrderByChange(index, 'field', e.target.value)
                  }
                />
                {!readOnly ? (
                  <button
                    type="button"
                    onClick={() => toggleDirection(index)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                      order.direction === 'asc'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {order.direction === 'asc' ? (
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
                      order.direction === 'asc'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {order.direction === 'asc' ? (
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
                    onClick={() => handleRemoveOrderBy(index)}
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
    </div>
  );
};

export default RankConfigPanel;
