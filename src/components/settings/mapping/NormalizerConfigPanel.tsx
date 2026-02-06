/**
 * Normalizer変換の設定パネル
 * 配列フィールドを展開してレコードを正規化する設定を行う
 */
import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { TransformationConfigProps } from './types';
import type { NormalizerConfig } from '../../../lib/MappingTypes';

const NormalizerConfigPanel: React.FC<TransformationConfigProps> = ({
  config,
  onChange,
  readOnly = false,
}) => {
  const normalizerConfig = config as unknown as NormalizerConfig;
  const arrayField = normalizerConfig.arrayField || '';
  const outputFields = normalizerConfig.outputFields || [];
  const keepOriginalFields = normalizerConfig.keepOriginalFields ?? true;

  /** 出力フィールドを追加 */
  const handleAddOutputField = () => {
    onChange({ ...config, outputFields: [...outputFields, ''] });
  };

  /** 出力フィールドを削除 */
  const handleRemoveOutputField = (index: number) => {
    const newOutputFields = outputFields.filter((_, i) => i !== index);
    onChange({ ...config, outputFields: newOutputFields });
  };

  /** 出力フィールドを更新 */
  const handleOutputFieldChange = (index: number, value: string) => {
    const newOutputFields = [...outputFields];
    newOutputFields[index] = value;
    onChange({ ...config, outputFields: newOutputFields });
  };

  return (
    <div className="space-y-4">
      {/* 配列フィールド */}
      <div>
        <label className="block text-xs text-gray-500 font-medium mb-1">
          展開する配列フィールド
        </label>
        <input
          disabled={readOnly}
          className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
          placeholder="例: items"
          value={arrayField}
          onChange={(e) => onChange({ ...config, arrayField: e.target.value })}
        />
        <p className="text-xs text-gray-400 mt-1">
          配列を含むフィールド名。各要素が個別のレコードとして出力されます。
        </p>
      </div>

      {/* 出力フィールド */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs text-gray-500 font-medium">
            出力フィールド（配列要素から抽出）
          </label>
          {!readOnly && (
            <button
              type="button"
              onClick={handleAddOutputField}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Plus size={12} />
              追加
            </button>
          )}
        </div>
        {outputFields.length === 0 ? (
          <p className="text-xs text-gray-400">
            配列要素から抽出するフィールドを指定してください
          </p>
        ) : (
          <div className="space-y-2">
            {outputFields.map((field, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  disabled={readOnly}
                  className="flex-1 border rounded p-1 text-sm disabled:bg-gray-100"
                  placeholder="フィールド名"
                  value={field}
                  onChange={(e) => handleOutputFieldChange(index, e.target.value)}
                />
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOutputField(index)}
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

      {/* 元のフィールドを保持 */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="keepOriginalFields"
          disabled={readOnly}
          checked={keepOriginalFields}
          onChange={(e) =>
            onChange({ ...config, keepOriginalFields: e.target.checked })
          }
          className="rounded"
        />
        <label htmlFor="keepOriginalFields" className="text-xs text-gray-600">
          元のレコードの他のフィールドを保持する
        </label>
      </div>

      {/* 説明 */}
      <div className="border rounded p-2 bg-blue-50 text-xs text-blue-700">
        <p className="font-medium mb-1">例：</p>
        <p>入力: {`{ id: 1, items: [{name: "A"}, {name: "B"}] }`}</p>
        <p>出力: {`{ id: 1, name: "A" }, { id: 1, name: "B" }`}</p>
      </div>
    </div>
  );
};

export default NormalizerConfigPanel;
