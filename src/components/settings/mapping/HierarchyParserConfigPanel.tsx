/**
 * HierarchyParser変換の設定パネル
 * 階層構造（JSON/XML）を解析してフラットなフィールドに変換する設定を行う
 */
import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { TransformationConfigProps } from './types';
import type { HierarchyParserConfig } from '../../../lib/MappingTypes';

/** フィールド型の選択肢 */
const FIELD_TYPES: { value: 'string' | 'number' | 'boolean'; label: string }[] = [
  { value: 'string', label: '文字列' },
  { value: 'number', label: '数値' },
  { value: 'boolean', label: '真偽値' },
];

const HierarchyParserConfigPanel: React.FC<TransformationConfigProps> = ({
  config,
  onChange,
  readOnly = false,
}) => {
  const parserConfig = config as unknown as HierarchyParserConfig;
  const inputField = parserConfig.inputField || '';
  const outputFields = parserConfig.outputFields || [];

  /** 出力フィールドを追加 */
  const handleAddOutputField = () => {
    onChange({
      ...config,
      outputFields: [
        ...outputFields,
        { path: '', name: '', type: 'string' as const },
      ],
    });
  };

  /** 出力フィールドを削除 */
  const handleRemoveOutputField = (index: number) => {
    const newOutputFields = outputFields.filter((_, i) => i !== index);
    onChange({ ...config, outputFields: newOutputFields });
  };

  /** 出力フィールドを更新 */
  const handleOutputFieldChange = (
    index: number,
    field: 'path' | 'name' | 'type',
    value: string
  ) => {
    const newOutputFields = [...outputFields];
    newOutputFields[index] = { ...newOutputFields[index], [field]: value };
    onChange({ ...config, outputFields: newOutputFields });
  };

  return (
    <div className="space-y-4">
      {/* 入力フィールド */}
      <div>
        <label className="block text-xs text-gray-500 font-medium mb-1">
          入力フィールド（階層データを含むフィールド）
        </label>
        <input
          disabled={readOnly}
          className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
          placeholder="例: json_data"
          value={inputField}
          onChange={(e) => onChange({ ...config, inputField: e.target.value })}
        />
        <p className="text-xs text-gray-400 mt-1">
          JSON/XMLなどの階層構造を含むフィールド
        </p>
      </div>

      {/* 出力フィールド定義 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs text-gray-500 font-medium">
            出力フィールド定義
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
            抽出するフィールドを定義してください
          </p>
        ) : (
          <div className="space-y-3">
            {outputFields.map((field, index) => (
              <div
                key={index}
                className="border rounded p-2 bg-gray-50 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">フィールド #{index + 1}</span>
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
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-gray-400">パス</label>
                    <input
                      disabled={readOnly}
                      className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                      placeholder="例: data.user.name"
                      value={field.path}
                      onChange={(e) =>
                        handleOutputFieldChange(index, 'path', e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400">出力名</label>
                    <input
                      disabled={readOnly}
                      className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                      placeholder="例: user_name"
                      value={field.name}
                      onChange={(e) =>
                        handleOutputFieldChange(index, 'name', e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400">型</label>
                    <select
                      disabled={readOnly}
                      className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                      value={field.type}
                      onChange={(e) =>
                        handleOutputFieldChange(index, 'type', e.target.value)
                      }
                    >
                      {FIELD_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 説明 */}
      <div className="border rounded p-2 bg-blue-50 text-xs text-blue-700">
        <p className="font-medium mb-1">パス記法:</p>
        <p>• <code className="bg-blue-100 px-1 rounded">data.name</code> - ネストしたプロパティ</p>
        <p>• <code className="bg-blue-100 px-1 rounded">items[0]</code> - 配列の要素</p>
        <p>• <code className="bg-blue-100 px-1 rounded">items[*].id</code> - 配列内の全要素</p>
      </div>
    </div>
  );
};

export default HierarchyParserConfigPanel;
