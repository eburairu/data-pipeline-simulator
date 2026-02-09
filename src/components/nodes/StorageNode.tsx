import React from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Folder, Database, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import ProgressBar from '../common/ProgressBar';

export type StorageNodeData = {
  label: string;
  type: 'fs' | 'db';
  count: number;
  capacity?: number; // Max records/files
  trend?: 'up' | 'down' | 'stable';
  sourcePos?: Position;
  targetPos?: Position;
};

const StorageNode: React.FC<NodeProps<StorageNodeData>> = ({ data, selected }) => {
  const usagePercent = data.capacity ? Math.min(100, (data.count / data.capacity) * 100) : 0;

  const getTrendIcon = () => {
    switch (data.trend) {
      case 'up': return <TrendingUp className="w-3 h-3 text-green-500" />;
      case 'down': return <TrendingDown className="w-3 h-3 text-red-500" />;
      case 'stable': return <Minus className="w-3 h-3 text-gray-400" />;
      default: return null;
    }
  };

  return (
    <div className={`bg-white border-2 rounded-md shadow-sm w-44 overflow-hidden transition-all duration-200 ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300 hover:border-gray-400'}`}>
      <Handle
        type="target"
        position={data.targetPos || Position.Left}
        className="w-3 h-3 !bg-gray-400 hover:!bg-blue-500 transition-colors"
        style={{ left: -6 }}
      />

      {/* Header */}
      <div className="bg-gray-50 p-2 border-b border-gray-200 flex items-center gap-2">
        {data.type === 'fs' ? (
          <Folder className="w-4 h-4 text-yellow-500 shrink-0" />
        ) : (
          <Database className="w-4 h-4 text-blue-500 shrink-0" />
        )}
        <span className="text-xs font-bold text-gray-700 truncate flex-1" title={data.label}>
          {data.label}
        </span>
        {data.trend && (
            <div className="bg-white rounded-full p-0.5 shadow-sm border border-gray-100" title={`Trend: ${data.trend}`}>
                {getTrendIcon()}
            </div>
        )}
      </div>

      {/* Body */}
      <div className="p-3 text-center relative">
        <div className="flex justify-center items-baseline gap-1">
            <span className="text-xl font-bold text-gray-800">{data.count.toLocaleString()}</span>
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">
            {data.type === 'fs' ? 'Files' : 'Rows'}
            </span>
        </div>

        {/* Capacity / Usage Bar */}
        {data.capacity && (
            <ProgressBar 
              percent={usagePercent}
              colorFn={(p) => p > 90 ? 'bg-red-500' : p > 70 ? 'bg-yellow-500' : 'bg-blue-500'}
              className="mt-2 border border-gray-200"
            />
        )}
        
        {data.capacity && (
            <div className="text-[9px] text-gray-400 mt-1 text-right">
                {usagePercent.toFixed(1)}% full
            </div>
        )}
      </div>

      <Handle
        type="source"
        position={data.sourcePos || Position.Right}
        className="w-3 h-3 !bg-gray-400 hover:!bg-blue-500 transition-colors"
        style={{ right: -6 }}
      />
    </div>
  );
};

export default StorageNode;