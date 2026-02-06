/**
 * 処理時間表示ウィジェット
 * パイプラインの処理時間を表示する
 */
import React from 'react';
import { Clock } from 'lucide-react';
import type { NumericWidgetProps } from './types';
import { registerWidget } from './index';

const ProcessingTimeWidget: React.FC<NumericWidgetProps> = ({
  title,
  value,
  unit = 'ms',
  change,
  changeDirection = 'negative',
  formatter,
  className = '',
}) => {
  const displayValue = formatter ? formatter(value) : value.toLocaleString();

  // 処理時間に応じた色を決定
  const valueColor = value > 5000 ? 'text-red-600' : value > 1000 ? 'text-yellow-600' : 'text-green-600';

  return (
    <div className={`bg-white rounded-lg shadow border p-4 flex flex-col gap-2 ${className}`}>
      <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold uppercase">
        <Clock size={14} className="text-purple-500" aria-hidden="true" />
        {title}
      </div>
      <div className={`text-2xl font-bold ${valueColor}`}>
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
  type: 'processingTime',
  component: ProcessingTimeWidget as React.ComponentType<import('./types').WidgetProps>,
  defaultTitle: '処理時間',
  defaultSize: { width: 200, height: 120 },
});

export default ProcessingTimeWidget;
