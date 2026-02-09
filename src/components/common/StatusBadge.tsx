import React from 'react';
import { getJobStatusBadge } from '../../lib/statusUtils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

/**
 * ジョブステータスを表示する汎用バッジコンポーネント
 */
const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const config = getJobStatusBadge(status);
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-full ${config.bgColor} ${config.textColor} ${className}`}>
      <Icon size={10} className={status === 'running' ? 'animate-spin' : ''} />
      {config.label}
    </span>
  );
};

export default StatusBadge;
