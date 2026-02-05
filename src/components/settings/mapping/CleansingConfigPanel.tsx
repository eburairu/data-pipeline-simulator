/**
 * Cleansing変換の設定パネル
 * データのクレンジング（正規化・変換）ルールを設定する
 */
import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { TransformationConfigProps } from './types';
import type { CleansingConfig, CleansingRule } from '../../../lib/MappingTypes';

/** クレンジング操作の選択肢 */
const CLEANSING_OPERATIONS: {
  value: CleansingRule['operation'];
  label: string;
  description: string;
}[] = [
  { value: 'trim', label: 'トリム', description: '前後の空白を削除' },
  { value: 'upper', label: '大文字化', description: 'すべて大文字に変換' },
  { value: 'lower', label: '小文字化', description: 'すべて小文字に変換' },
  { value: 'nullToDefault', label: 'NULL置換', description: 'NULLをデフォルト値に置換' },
  { value: 'replace', label: '置換', description: 'パターンを別の値に置換' },
];

const CleansingConfigPanel: React.FC<TransformationConfigProps> = ({
  config,
  onChange,
  readOnly = false,
}) => {
  const cleansingConfig = config as unknown as CleansingConfig;
  const rules = cleansingConfig.rules || [];

  /** ルールを追加 */
  const handleAddRule = () => {
    const newRule: CleansingRule = {
      field: '',
      operation: 'trim',
    };
    onChange({ ...config, rules: [...rules, newRule] });
  };

  /** ルールを削除 */
  const handleRemoveRule = (index: number) => {
    const newRules = rules.filter((_, i) => i !== index);
    onChange({ ...config, rules: newRules });
  };

  /** ルールを更新 */
  const handleRuleChange = (
    index: number,
    field: keyof CleansingRule,
    value: string
  ) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], [field]: value };
    onChange({ ...config, rules: newRules });
  };

  return (
    <div className="space-y-4">
      {/* クレンジングルール */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs text-gray-500 font-medium">
            クレンジングルール
          </label>
          {!readOnly && (
            <button
              type="button"
              onClick={handleAddRule}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Plus size={12} />
              追加
            </button>
          )}
        </div>
        {rules.length === 0 ? (
          <p className="text-xs text-gray-400">
            クレンジングルールを追加してください
          </p>
        ) : (
          <div className="space-y-3">
            {rules.map((rule, index) => (
              <div
                key={index}
                className="border rounded p-2 bg-gray-50 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">ルール #{index + 1}</span>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRule(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-400">対象フィールド</label>
                    <input
                      disabled={readOnly}
                      className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                      placeholder="フィールド名"
                      value={rule.field}
                      onChange={(e) =>
                        handleRuleChange(index, 'field', e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400">操作</label>
                    <select
                      disabled={readOnly}
                      className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                      value={rule.operation}
                      onChange={(e) =>
                        handleRuleChange(index, 'operation', e.target.value)
                      }
                    >
                      {CLEANSING_OPERATIONS.map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 操作固有のオプション */}
                {rule.operation === 'nullToDefault' && (
                  <div>
                    <label className="block text-xs text-gray-400">
                      デフォルト値
                    </label>
                    <input
                      disabled={readOnly}
                      className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                      placeholder="例: N/A"
                      value={rule.defaultValue || ''}
                      onChange={(e) =>
                        handleRuleChange(index, 'defaultValue', e.target.value)
                      }
                    />
                  </div>
                )}

                {rule.operation === 'replace' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-400">
                        検索パターン（正規表現可）
                      </label>
                      <input
                        disabled={readOnly}
                        className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                        placeholder="例: [0-9]+-"
                        value={rule.replacePattern || ''}
                        onChange={(e) =>
                          handleRuleChange(index, 'replacePattern', e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400">置換後</label>
                      <input
                        disabled={readOnly}
                        className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                        placeholder="例: -"
                        value={rule.replaceWith || ''}
                        onChange={(e) =>
                          handleRuleChange(index, 'replaceWith', e.target.value)
                        }
                      />
                    </div>
                  </div>
                )}

                {/* 操作の説明 */}
                <p className="text-xs text-gray-400">
                  {CLEANSING_OPERATIONS.find((op) => op.value === rule.operation)
                    ?.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-xs text-gray-400">
        ルールは上から順に適用されます。同じフィールドに複数のルールを設定できます。
      </div>
    </div>
  );
};

export default CleansingConfigPanel;
