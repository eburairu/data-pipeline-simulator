/**
 * Sequence変換の設定パネル
 * データに連番を付与する設定を行う
 */
import React from 'react';
import type { TransformationConfigProps } from './types';
import type { SequenceConfig } from '../../../lib/MappingTypes';

const SequenceConfigPanel: React.FC<TransformationConfigProps> = ({
  config,
  onChange,
  readOnly = false,
}) => {
  const sequenceConfig = config as unknown as SequenceConfig;
  const sequenceField = sequenceConfig.sequenceField || '';
  const startValue = sequenceConfig.startValue ?? 1;
  const incrementBy = sequenceConfig.incrementBy ?? 1;

  return (
    <div className="space-y-4">
      {/* シーケンス出力フィールド */}
      <div>
        <label className="block text-xs text-gray-500 font-medium mb-1">
          出力フィールド名
        </label>
        <input
          disabled={readOnly}
          className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
          placeholder="例: seq_id"
          value={sequenceField}
          onChange={(e) => onChange({ ...config, sequenceField: e.target.value })}
        />
        <p className="text-xs text-gray-400 mt-1">
          シーケンス番号を格納するフィールド名
        </p>
      </div>

      {/* 開始値 */}
      <div>
        <label className="block text-xs text-gray-500 font-medium mb-1">
          開始値
        </label>
        <input
          disabled={readOnly}
          type="number"
          className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
          value={startValue}
          onChange={(e) =>
            onChange({ ...config, startValue: parseInt(e.target.value, 10) || 1 })
          }
        />
        <p className="text-xs text-gray-400 mt-1">
          最初のレコードに付与される番号
        </p>
      </div>

      {/* 増分値 */}
      <div>
        <label className="block text-xs text-gray-500 font-medium mb-1">
          増分値
        </label>
        <input
          disabled={readOnly}
          type="number"
          className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
          value={incrementBy}
          onChange={(e) =>
            onChange({ ...config, incrementBy: parseInt(e.target.value, 10) || 1 })
          }
        />
        <p className="text-xs text-gray-400 mt-1">
          各レコードごとに増加する値（負の値も可）
        </p>
      </div>

      {/* プレビュー */}
      <div className="border rounded p-2 bg-blue-50">
        <label className="block text-xs text-blue-600 font-medium mb-1">
          プレビュー
        </label>
        <p className="text-sm text-blue-800">
          {sequenceField || 'field_name'}: {startValue}, {startValue + incrementBy},{' '}
          {startValue + incrementBy * 2}, {startValue + incrementBy * 3}, ...
        </p>
      </div>
    </div>
  );
};

export default SequenceConfigPanel;
