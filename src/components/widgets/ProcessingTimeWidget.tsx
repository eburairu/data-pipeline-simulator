/**
 * 処理時間表示ウィジェット
 * パイプラインの処理時間を表示する
 */
import React from 'react';
import { Clock } from 'lucide-react';
import type { NumericWidgetProps } from './types';
import NumericWidget from './NumericWidget';

const ProcessingTimeWidget: React.FC<NumericWidgetProps> = (props) => {
  const valueColorFn = (value: number) => {
    if (value === undefined) return 'text-gray-400';
    if (value > 5000) return 'text-red-600';
    if (value > 1000) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <NumericWidget
      {...props}
      icon={Clock}
      iconColorClass="text-purple-500"
      unit={props.unit || 'ms'}
      valueColorFn={valueColorFn}
    />
  );
};

export default ProcessingTimeWidget;