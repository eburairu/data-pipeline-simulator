/**
 * Joiner変換の設定パネル
 * 2つのデータソースの結合設定を行う
 */
import React from 'react';
import { Trash2, Plus } from 'lucide-react';
import type { TransformationConfigProps } from './types';
import type { JoinerConfig } from '../../../lib/MappingTypes';

const JoinerConfigPanel: React.FC<TransformationConfigProps> = ({
  config,
  onChange,
  readOnly = false,
}) => {
  const joinerConfig = config as unknown as JoinerConfig;

  // マスターキーを更新するヘルパー関数
  const updateMasterKey = (index: number, value: string) => {
    const newKeys = [...(joinerConfig.masterKeys || [])];
    newKeys[index] = value;
    onChange({ ...config, masterKeys: newKeys });
  };

  // マスターキーを削除するヘルパー関数
  const removeMasterKey = (index: number) => {
    const newKeys = (joinerConfig.masterKeys || []).filter((_, i) => i !== index);
    onChange({ ...config, masterKeys: newKeys });
  };

  // マスターキーを追加するヘルパー関数
  const addMasterKey = () => {
    onChange({ ...config, masterKeys: [...(joinerConfig.masterKeys || []), ''] });
  };

  // 詳細キーを更新するヘルパー関数
  const updateDetailKey = (index: number, value: string) => {
    const newKeys = [...(joinerConfig.detailKeys || [])];
    newKeys[index] = value;
    onChange({ ...config, detailKeys: newKeys });
  };

  // 詳細キーを削除するヘルパー関数
  const removeDetailKey = (index: number) => {
    const newKeys = (joinerConfig.detailKeys || []).filter((_, i) => i !== index);
    onChange({ ...config, detailKeys: newKeys });
  };

  // 詳細キーを追加するヘルパー関数
  const addDetailKey = () => {
    onChange({ ...config, detailKeys: [...(joinerConfig.detailKeys || []), ''] });
  };

  return (
    <div className="space-y-3">
      {/* 結合タイプ */}
      <div>
        <label className="block text-xs text-gray-500">結合タイプ</label>
        <select
          disabled={readOnly}
          className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
          value={joinerConfig.joinType || 'inner'}
          onChange={(e) =>
            onChange({
              ...config,
              joinType: e.target.value as 'inner' | 'left' | 'right' | 'full',
            })
          }
        >
          <option value="inner">INNER JOIN</option>
          <option value="left">LEFT JOIN</option>
          <option value="right">RIGHT JOIN</option>
          <option value="full">FULL JOIN</option>
        </select>
      </div>

      {/* マスターキー */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">マスターキー</label>
        {(joinerConfig.masterKeys || []).map((key, idx) => (
          <div key={idx} className="flex gap-2 items-center mb-2">
            <input
              disabled={readOnly}
              className="flex-1 border rounded p-1 text-sm disabled:bg-gray-100"
              placeholder="フィールド名"
              value={key}
              onChange={(e) => updateMasterKey(idx, e.target.value)}
            />
            {!readOnly && (
              <button
                onClick={() => removeMasterKey(idx)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
        {!readOnly && (
          <button
            onClick={addMasterKey}
            className="text-blue-600 text-xs hover:underline flex items-center gap-1"
          >
            <Plus size={12} /> キーを追加
          </button>
        )}
      </div>

      {/* 詳細キー */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">詳細キー</label>
        {(joinerConfig.detailKeys || []).map((key, idx) => (
          <div key={idx} className="flex gap-2 items-center mb-2">
            <input
              disabled={readOnly}
              className="flex-1 border rounded p-1 text-sm disabled:bg-gray-100"
              placeholder="フィールド名"
              value={key}
              onChange={(e) => updateDetailKey(idx, e.target.value)}
            />
            {!readOnly && (
              <button
                onClick={() => removeDetailKey(idx)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
        {!readOnly && (
          <button
            onClick={addDetailKey}
            className="text-blue-600 text-xs hover:underline flex items-center gap-1"
          >
            <Plus size={12} /> キーを追加
          </button>
        )}
      </div>

      <p className="text-xs text-gray-400">
        マスターキーと詳細キーは同じ順序で対応します。
        例: マスター(id) ↔ 詳細(order_id)
      </p>
    </div>
  );
};

export default JoinerConfigPanel;
