/**
 * Expression変換の設定パネル
 * フィールドの変換式を設定する
 */
import React from 'react';
import { Trash2, Plus } from 'lucide-react';
import type { TransformationConfigProps } from './types';
import type { ExpressionConfig, FieldExpression } from '../../../lib/MappingTypes';

const ExpressionConfigPanel: React.FC<TransformationConfigProps> = ({
  config,
  onChange,
  readOnly = false,
}) => {
  const expressionConfig = config as unknown as ExpressionConfig;
  const fields = expressionConfig.fields || [];

  // フィールドを更新するヘルパー関数
  const updateField = (index: number, updates: Partial<FieldExpression>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    onChange({ ...config, fields: newFields });
  };

  // フィールドを削除するヘルパー関数
  const removeField = (index: number) => {
    const newFields = fields.filter((_, i) => i !== index);
    onChange({ ...config, fields: newFields });
  };

  // 新しいフィールドを追加するヘルパー関数
  const addField = () => {
    const newField: FieldExpression = {
      name: '',
      expression: '',
    };
    onChange({ ...config, fields: [...fields, newField] });
  };

  return (
    <div className="space-y-3">
      <label className="block text-xs text-gray-500 mb-1">フィールド式</label>

      {fields.map((field: FieldExpression, idx: number) => (
        <div key={idx} className="border p-2 rounded bg-gray-50 space-y-2 mb-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium">フィールド {idx + 1}</span>
            {!readOnly && (
              <button
                onClick={() => removeField(idx)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs text-gray-500">出力フィールド名</label>
            <input
              disabled={readOnly}
              className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
              placeholder="new_field"
              value={field.name || ''}
              onChange={(e) => updateField(idx, { name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500">式</label>
            <input
              disabled={readOnly}
              className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
              placeholder="例: CONCAT(first_name, ' ', last_name)"
              value={field.expression || ''}
              onChange={(e) => updateField(idx, { expression: e.target.value })}
            />
          </div>
        </div>
      ))}

      {!readOnly && (
        <button
          onClick={addField}
          className="text-blue-600 text-xs hover:underline flex items-center gap-1"
        >
          <Plus size={12} /> フィールドを追加
        </button>
      )}

      <p className="text-xs text-gray-400">
        利用可能な関数: CONCAT, SUBSTRING, TRIM, UPPER, LOWER, TO_NUMBER, ROUND,
        TO_DATE, DATE_FORMAT, IIF, DECODE, COALESCE など
      </p>
    </div>
  );
};

export default ExpressionConfigPanel;
