/**
 * UpdateStrategy変換の設定パネル
 * レコードの更新戦略（Insert/Update/Delete）を決定する設定を行う
 */
import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { TransformationConfigProps } from './types';
import type { UpdateStrategyConfig } from '../../../lib/MappingTypes';

/** 更新戦略の選択肢 */
const STRATEGIES: {
  value: 'insert' | 'update' | 'delete' | 'reject';
  label: string;
  color: string;
}[] = [
  { value: 'insert', label: '挿入', color: 'bg-green-100 text-green-700' },
  { value: 'update', label: '更新', color: 'bg-blue-100 text-blue-700' },
  { value: 'delete', label: '削除', color: 'bg-red-100 text-red-700' },
  { value: 'reject', label: '拒否', color: 'bg-gray-100 text-gray-700' },
];

const UpdateStrategyConfigPanel: React.FC<TransformationConfigProps> = ({
  config,
  onChange,
  readOnly = false,
}) => {
  const strategyConfig = config as unknown as UpdateStrategyConfig;
  const strategyField = strategyConfig.strategyField || '';
  const defaultStrategy = strategyConfig.defaultStrategy || 'insert';
  const conditions = strategyConfig.conditions || [];

  /** 条件を追加 */
  const handleAddCondition = () => {
    onChange({
      ...config,
      conditions: [...conditions, { condition: '', strategy: 'insert' as const }],
    });
  };

  /** 条件を削除 */
  const handleRemoveCondition = (index: number) => {
    const newConditions = conditions.filter((_, i) => i !== index);
    onChange({ ...config, conditions: newConditions });
  };

  /** 条件を更新 */
  const handleConditionChange = (
    index: number,
    field: 'condition' | 'strategy',
    value: string
  ) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    onChange({ ...config, conditions: newConditions });
  };

  return (
    <div className="space-y-4">
      {/* 戦略フィールド */}
      <div>
        <label className="block text-xs text-gray-500 font-medium mb-1">
          戦略出力フィールド
        </label>
        <input
          disabled={readOnly}
          className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
          placeholder="例: update_strategy"
          value={strategyField}
          onChange={(e) => onChange({ ...config, strategyField: e.target.value })}
        />
        <p className="text-xs text-gray-400 mt-1">
          決定された戦略が格納されるフィールド名
        </p>
      </div>

      {/* デフォルト戦略 */}
      <div>
        <label className="block text-xs text-gray-500 font-medium mb-1">
          デフォルト戦略
        </label>
        <div className="flex gap-2">
          {STRATEGIES.map((s) => (
            <button
              key={s.value}
              type="button"
              disabled={readOnly}
              onClick={() => onChange({ ...config, defaultStrategy: s.value })}
              className={`px-3 py-1 rounded text-xs ${
                defaultStrategy === s.value
                  ? s.color + ' ring-2 ring-offset-1 ring-gray-400'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              } ${readOnly ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          どの条件にもマッチしなかった場合に適用される戦略
        </p>
      </div>

      {/* 条件ベースの戦略 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs text-gray-500 font-medium">
            条件による戦略決定
          </label>
          {!readOnly && (
            <button
              type="button"
              onClick={handleAddCondition}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Plus size={12} />
              追加
            </button>
          )}
        </div>
        {conditions.length === 0 ? (
          <p className="text-xs text-gray-400">
            すべてのレコードにデフォルト戦略が適用されます
          </p>
        ) : (
          <div className="space-y-3">
            {conditions.map((cond, index) => (
              <div
                key={index}
                className="border rounded p-2 bg-gray-50 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">条件 #{index + 1}</span>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCondition(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-400">
                    条件 (JavaScript式)
                  </label>
                  <input
                    disabled={readOnly}
                    className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                    placeholder="例: _exists === true"
                    value={cond.condition}
                    onChange={(e) =>
                      handleConditionChange(index, 'condition', e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400">戦略</label>
                  <div className="flex gap-2">
                    {STRATEGIES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        disabled={readOnly}
                        onClick={() =>
                          handleConditionChange(index, 'strategy', s.value)
                        }
                        className={`px-2 py-1 rounded text-xs ${
                          cond.strategy === s.value
                            ? s.color
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        } ${readOnly ? 'cursor-not-allowed opacity-50' : ''}`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 説明 */}
      <div className="border rounded p-2 bg-gray-50 text-xs text-gray-500 space-y-1">
        <p>• 条件は上から順に評価され、最初にマッチした戦略が適用されます</p>
        <p>• <code className="bg-gray-200 px-1 rounded">_exists</code> 変数でターゲットにレコードが存在するか確認可能</p>
        <p>• 戦略はターゲットノードで使用され、実際のデータ操作を制御します</p>
      </div>
    </div>
  );
};

export default UpdateStrategyConfigPanel;
