/**
 * スループット表示ウィジェット
 * 単位時間あたりの処理レコード数を表示する
 */
import React from 'react';
import { Activity } from 'lucide-react';
import type { NumericWidgetProps } from './types';
import NumericWidget from './NumericWidget';

const ThroughputWidget: React.FC<NumericWidgetProps> = (props) => {
  return (
    <NumericWidget
      {...props}
      icon={Activity}
      iconColorClass="text-green-500"
      unit={props.unit || 'rec/s'}
    />
  );
};

export default ThroughputWidget;