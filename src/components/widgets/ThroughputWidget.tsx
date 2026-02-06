/**
 * スループット表示ウィジェット
 * 単位時間あたりの処理レコード数を表示する
 */
import React from 'react';
import { Activity } from 'lucide-react';
import type { NumericWidgetProps } from './types';
import { registerWidget } from './index';

const ThroughputWidget: React.FC<NumericWidgetProps> = ({
  title,
  value,
  unit = 'rec/s',
  change,
  changeDirection = 'positive',
  formatter,
  className = '',
}) => {
  const displayValue = formatter ? formatter(value) : value.toLocaleString();

  return (
    <div className={`bg-white rounded-lg shadow border p-4 flex flex-col gap-2 ${className}`}>
      <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold uppercase">
        <Activity size={14} className="text-green-500" aria-hidden="true" />
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

/** ウィジェット登録 */
registerWidget({
  type: 'throughput',
  component: ThroughputWidget as React.ComponentType<import('./types').WidgetProps>,
  defaultTitle: 'スループット',
  defaultSize: { width: 200, height: 120 },
});

export default ThroughputWidget;
