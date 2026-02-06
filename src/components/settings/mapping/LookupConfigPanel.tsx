/**
 * Lookup変換の設定パネル
 * 参照テーブルからデータを検索して結合する設定を行う
 */
import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { TransformationConfigProps } from './types';
import type { LookupConfig } from '../../../lib/MappingTypes';

const LookupConfigPanel: React.FC<TransformationConfigProps> = ({
  config,
  onChange,
  readOnly = false,
  connections = [],
}) => {
  const lookupConfig = config as unknown as LookupConfig;
  const connectionId = lookupConfig.connectionId || '';
  const path = lookupConfig.path || '';
  const tableName = lookupConfig.tableName || '';
  const lookupKeys = lookupConfig.lookupKeys || [];
  const referenceKeys = lookupConfig.referenceKeys || [];
  const returnFields = lookupConfig.returnFields || [];
  const defaultValue = lookupConfig.defaultValue || '';

  // 選択中の接続情報を取得
  const selectedConnection = connections.find((c) => c.id === connectionId);
  const isFileConnection = selectedConnection?.type === 'file';
  const isDbConnection = selectedConnection?.type === 'database';

  /** キーペアを追加 */
  const handleAddKeyPair = () => {
    onChange({
      ...config,
      lookupKeys: [...lookupKeys, ''],
      referenceKeys: [...referenceKeys, ''],
    });
  };

  /** キーペアを削除 */
  const handleRemoveKeyPair = (index: number) => {
    const newLookupKeys = lookupKeys.filter((_, i) => i !== index);
    const newReferenceKeys = referenceKeys.filter((_, i) => i !== index);
    onChange({
      ...config,
      lookupKeys: newLookupKeys,
      referenceKeys: newReferenceKeys,
    });
  };

  /** キーを更新 */
  const handleKeyChange = (
    index: number,
    type: 'lookup' | 'reference',
    value: string
  ) => {
    if (type === 'lookup') {
      const newLookupKeys = [...lookupKeys];
      newLookupKeys[index] = value;
      onChange({ ...config, lookupKeys: newLookupKeys });
    } else {
      const newReferenceKeys = [...referenceKeys];
      newReferenceKeys[index] = value;
      onChange({ ...config, referenceKeys: newReferenceKeys });
    }
  };

  /** 戻りフィールドを追加 */
  const handleAddReturnField = () => {
    onChange({ ...config, returnFields: [...returnFields, ''] });
  };

  /** 戻りフィールドを削除 */
  const handleRemoveReturnField = (index: number) => {
    const newReturnFields = returnFields.filter((_, i) => i !== index);
    onChange({ ...config, returnFields: newReturnFields });
  };

  /** 戻りフィールドを更新 */
  const handleReturnFieldChange = (index: number, value: string) => {
    const newReturnFields = [...returnFields];
    newReturnFields[index] = value;
    onChange({ ...config, returnFields: newReturnFields });
  };

  return (
    <div className="space-y-4">
      {/* 接続選択 */}
      <div>
        <label className="block text-xs text-gray-500 font-medium mb-1">
          参照データソース
        </label>
        <select
          disabled={readOnly}
          className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
          value={connectionId}
          onChange={(e) => onChange({ ...config, connectionId: e.target.value })}
        >
          <option value="">-- 接続を選択 --</option>
          {connections.map((conn) => (
            <option key={conn.id} value={conn.id}>
              {conn.name} ({conn.type})
            </option>
          ))}
        </select>
      </div>

      {/* ファイルパスまたはテーブル名 */}
      {isFileConnection && (
        <div>
          <label className="block text-xs text-gray-500 font-medium mb-1">
            ファイルパス
          </label>
          <input
            disabled={readOnly}
            className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
            placeholder="例: /reference/master.csv"
            value={path}
            onChange={(e) => onChange({ ...config, path: e.target.value })}
          />
        </div>
      )}

      {isDbConnection && (
        <div>
          <label className="block text-xs text-gray-500 font-medium mb-1">
            テーブル名
          </label>
          <input
            disabled={readOnly}
            className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
            placeholder="例: master_table"
            value={tableName}
            onChange={(e) => onChange({ ...config, tableName: e.target.value })}
          />
        </div>
      )}

      {/* キーマッピング */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs text-gray-500 font-medium">
            キーマッピング
          </label>
          {!readOnly && (
            <button
              type="button"
              onClick={handleAddKeyPair}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Plus size={12} />
              追加
            </button>
          )}
        </div>
        {lookupKeys.length === 0 ? (
          <p className="text-xs text-gray-400">キーマッピングを追加してください</p>
        ) : (
          <div className="space-y-2">
            {lookupKeys.map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-2 border rounded p-2 bg-gray-50"
              >
                <div className="flex-1">
                  <label className="block text-xs text-gray-400">入力キー</label>
                  <input
                    disabled={readOnly}
                    className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                    placeholder="入力フィールド"
                    value={lookupKeys[index]}
                    onChange={(e) =>
                      handleKeyChange(index, 'lookup', e.target.value)
                    }
                  />
                </div>
                <span className="text-gray-400">=</span>
                <div className="flex-1">
                  <label className="block text-xs text-gray-400">参照キー</label>
                  <input
                    disabled={readOnly}
                    className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                    placeholder="参照フィールド"
                    value={referenceKeys[index]}
                    onChange={(e) =>
                      handleKeyChange(index, 'reference', e.target.value)
                    }
                  />
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemoveKeyPair(index)}
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

      {/* 戻りフィールド */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs text-gray-500 font-medium">
            取得フィールド
          </label>
          {!readOnly && (
            <button
              type="button"
              onClick={handleAddReturnField}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Plus size={12} />
              追加
            </button>
          )}
        </div>
        {returnFields.length === 0 ? (
          <p className="text-xs text-gray-400">
            取得するフィールドを追加してください
          </p>
        ) : (
          <div className="space-y-2">
            {returnFields.map((field, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  disabled={readOnly}
                  className="flex-1 border rounded p-1 text-sm disabled:bg-gray-100"
                  placeholder="フィールド名"
                  value={field}
                  onChange={(e) => handleReturnFieldChange(index, e.target.value)}
                />
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemoveReturnField(index)}
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

      {/* デフォルト値 */}
      <div>
        <label className="block text-xs text-gray-500 font-medium mb-1">
          デフォルト値（ヒットなし時）
        </label>
        <input
          disabled={readOnly}
          className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
          placeholder="例: N/A"
          value={defaultValue}
          onChange={(e) => onChange({ ...config, defaultValue: e.target.value })}
        />
        <p className="text-xs text-gray-400 mt-1">
          参照データにマッチしなかった場合に使用する値
        </p>
      </div>
    </div>
  );
};

export default LookupConfigPanel;
