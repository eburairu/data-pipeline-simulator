import React from 'react';

interface ProgressBarProps {
  percent: number;
  colorClass?: string;
  colorFn?: (percent: number) => string;
  heightClass?: string;
  bgClass?: string;
  className?: string;
}

/**
 * 汎用プログレスバーコンポーネント
 */
const ProgressBar: React.FC<ProgressBarProps> = ({
  percent,
  colorClass = 'bg-blue-500',
  colorFn,
  heightClass = 'h-1.5',
  bgClass = 'bg-gray-200',
  className = ''
}) => {
  const displayColorClass = colorFn ? colorFn(percent) : colorClass;
  const clampedPercent = Math.min(100, Math.max(0, percent));

  return (
    <div className={`w-full ${heightClass} ${bgClass} rounded-full overflow-hidden ${className}`}>
      <div
        className={`h-full ${displayColorClass} transition-all duration-300 ease-out`}
        style={{ width: `${clampedPercent}%` }}
      />
    </div>
  );
};

export default ProgressBar;
