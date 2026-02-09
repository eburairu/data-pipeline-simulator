/**
 * レコード数表示ウィジェット
 * 処理されたレコードの総数をリアルタイムで表示する
 */
import React from 'react';
import { Database } from 'lucide-react';
import type { NumericWidgetProps } from './types';
import NumericWidget from './NumericWidget';

const RecordCountWidget: React.FC<NumericWidgetProps> = (props) => {
  return (
    <NumericWidget
      {...props}
      icon={Database}
      iconColorClass="text-blue-500"
      unit={props.unit || '件'}
    />
  );
};

export default RecordCountWidget;