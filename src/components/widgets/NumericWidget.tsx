import React from 'react';
import type { LucideIcon } from 'lucide-react';
import type { NumericWidgetProps } from './types';

interface NumericWidgetInternalProps extends NumericWidgetProps {
  icon: LucideIcon;
  iconColorClass: string;
  valueColorFn?: (value: number) => string;
}

/**
 * 数値ウィジェットの共通描画コンポーネント
 */
const NumericWidget: React.FC<NumericWidgetInternalProps> = ({
  title,
  value,
  unit,
  change,
  changeDirection = 'positive',
  formatter,
  className = '',
  icon: Icon,
  iconColorClass,
  valueColorFn
}) => {
  const displayValue = value !== undefined 
    ? (formatter ? formatter(value) : value.toLocaleString())
    : '---';

  const valueColorClass = valueColorFn ? valueColorFn(value) : 'text-gray-800';

  return (
    <div className={`bg-white rounded-lg shadow border p-4 flex flex-col gap-2 ${className}`}>
      <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold uppercase">
        <Icon size={14} className={iconColorClass} aria-hidden="true" />
        {title}
      </div>
      <div className={`text-2xl font-bold ${valueColorClass}`}>
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

export default NumericWidget;
