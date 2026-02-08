/**
 * エラー率表示ウィジェット
 * パイプライン全体のエラー率を表示する
 */
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { NumericWidgetProps } from './types';

const ErrorRateWidget: React.FC<NumericWidgetProps> = ({
  title,
  value,
  unit = '%',
  change,
  changeDirection = 'negative',
  formatter,
  className = '',
}) => {
  const displayValue = value !== undefined 
    ? (formatter ? formatter(value) : value.toFixed(2))
    : '---';

  // エラー率に応じた色を決定
  const valueColor = value === undefined ? 'text-gray-400' : value > 5 ? 'text-red-600' : value > 1 ? 'text-yellow-600' : 'text-green-600';

  return (
    <div className={`bg-white rounded-lg shadow border p-4 flex flex-col gap-2 ${className}`}>
      <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold uppercase">
        <AlertTriangle size={14} className="text-orange-500" aria-hidden="true" />
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
          {change > 0 ? '+' : ''}{change.toFixed(2)} {unit}
        </div>
      )}
    </div>
  );
};

export default ErrorRateWidget;
