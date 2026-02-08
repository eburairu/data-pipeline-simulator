/**
 * レコード数表示ウィジェット
 * 処理されたレコードの総数をリアルタイムで表示する
 */
import React from 'react';
import { Database } from 'lucide-react';
import type { NumericWidgetProps } from './types';

const RecordCountWidget: React.FC<NumericWidgetProps> = ({
  title,
  value,
  unit = '件',
  change,
  changeDirection = 'positive',
  formatter,
  className = '',
}) => {
  const displayValue = value !== undefined 
    ? (formatter ? formatter(value) : value.toLocaleString())
    : '---';

  return (
    <div className={`bg-white rounded-lg shadow border p-4 flex flex-col gap-2 ${className}`}>
      <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold uppercase">
        <Database size={14} className="text-blue-500" aria-hidden="true" />
        {title}
      </div>
      <div className="text-2xl font-bold text-gray-800">
        {displayValue}
        <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>
      </div>
      {change !== undefined && (
        <div className={`text-xs font-medium ${
          changeDirection === 'positive' ? 'text-green-600' :
          changeDirection === 'negative' ? 'text-red-600' : 'text-gray-500'
        }`}>
          {change > 0 ? '+' : ''}{change.toLocaleString()} {unit}
        </div>
      )}
    </div>
  );
};

export default RecordCountWidget;
