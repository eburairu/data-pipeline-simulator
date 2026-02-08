import React from 'react';
import { TRANSFORMATION_TYPES } from './constants';
import type { TransformationType } from '../../../lib/MappingTypes';

interface TransformationToolbarProps {
  readOnly: boolean;
  addTransformation: (type: TransformationType) => void;
}

const TransformationToolbar: React.FC<TransformationToolbarProps> = ({ readOnly, addTransformation }) => {
  if (readOnly) return null;

  return (
    <div className="w-full md:w-48 h-auto md:h-full bg-gray-100 border-t md:border-t-0 md:border-r flex flex-row md:flex-col items-center md:items-stretch justify-start py-2 gap-2 overflow-x-auto md:overflow-y-auto order-last md:order-first shrink-0 px-2">
      {TRANSFORMATION_TYPES.map((t) => (
        <button
          key={t.type}
          title={`Add ${t.label}`}
          aria-label={`${t.label} を追加`}
          onClick={() => addTransformation(t.type as TransformationType)}
          className="flex items-center gap-2 p-1 rounded hover:bg-gray-200 group transition-colors"
        >
          <div className={`w-8 h-8 ${t.bg} ${t.border} border rounded flex items-center justify-center text-[10px] shrink-0`}>
            {t.icon ? <t.icon size={12} /> : t.short}
          </div>
          <span className="text-sm text-gray-700 hidden md:block whitespace-nowrap">{t.label}</span>
        </button>
      ))}
    </div>
  );
};

export default TransformationToolbar;
