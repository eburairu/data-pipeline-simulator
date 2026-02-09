/**
 * エラー率表示ウィジェット
 * パイプライン全体のエラー率を表示する
 */
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { NumericWidgetProps } from './types';
import NumericWidget from './NumericWidget';

const ErrorRateWidget: React.FC<NumericWidgetProps> = (props) => {
  const valueColorFn = (value: number) => {
    if (value === undefined) return 'text-gray-400';
    if (value > 5) return 'text-red-600';
    if (value > 1) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <NumericWidget
      {...props}
      icon={AlertTriangle}
      iconColorClass="text-orange-500"
      unit={props.unit || '%'}
      formatter={props.formatter || ((v) => v.toFixed(2))}
      valueColorFn={valueColorFn}
    />
  );
};

export default ErrorRateWidget;