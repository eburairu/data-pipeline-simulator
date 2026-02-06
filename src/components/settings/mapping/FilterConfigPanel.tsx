/**
 * Filter変換の設定パネル
 * データのフィルタリング条件を設定する
 */
import React from 'react';
import type { TransformationConfigProps } from './types';
import type { FilterConfig } from '../../../lib/MappingTypes';

const FilterConfigPanel: React.FC<TransformationConfigProps> = ({
  config,
  onChange,
  readOnly = false,
}) => {
  const filterConfig = config as unknown as FilterConfig;

  return (
    <div>
      <label className="block text-xs text-gray-500">
        フィルター条件 (JavaScript式)
      </label>
      <input
        disabled={readOnly}
        className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
        placeholder="例: amount > 100"
        value={filterConfig.condition || ''}
        onChange={(e) => onChange({ ...config, condition: e.target.value })}
      />
      <p className="text-xs text-gray-400 mt-1">
        レコードの各フィールドに直接アクセスできます。例: status === 'active' &&
        amount &gt; 1000
      </p>
    </div>
  );
};

export default FilterConfigPanel;
