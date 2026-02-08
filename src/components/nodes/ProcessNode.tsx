import React from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Settings, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export type ProcessNodeData = {
  label: string;
  status: 'idle' | 'running' | 'success' | 'error' | 'warning';
  progress?: number; // 0-100
  errorMessage?: string;
  sourcePos?: Position;
  targetPos?: Position;
  icon?: React.ReactNode;
  timestamp?: string;
};

const ProcessNode: React.FC<NodeProps<ProcessNodeData>> = ({ data, selected }) => {
  const { status = 'idle', progress } = data;

  const getStatusColor = () => {
    switch (status) {
      case 'running': return 'border-orange-500 bg-orange-50';
      case 'success': return 'border-green-500 bg-green-50';
      case 'error': return 'border-red-500 bg-red-50';
      case 'warning': return 'border-yellow-500 bg-yellow-50';
      default: return 'border-blue-500 bg-blue-50';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'running': return <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />;
      case 'success': return <CheckCircle2 className="w-8 h-8 text-green-600" />;
      case 'error': return <XCircle className="w-8 h-8 text-red-600" />;
      case 'warning': return <AlertCircle className="w-8 h-8 text-yellow-600" />;
      default: return data.icon ? <div className="text-blue-600">{data.icon}</div> : <Settings className="w-8 h-8 text-blue-600" />;
    }
  };

  return (
    <div className={`relative group flex flex-col items-center justify-center transition-transform duration-200 ${selected ? 'scale-110' : ''}`}>
       {/* Main Circle Node */}
       <div 
         className={`relative flex items-center justify-center w-16 h-16 rounded-full border-2 shadow-sm transition-all duration-300 ${getStatusColor()} ${selected ? 'ring-2 ring-blue-400 ring-offset-2' : ''}`}
         title={data.errorMessage || data.label}
       >
        <Handle
          type="target"
          position={data.targetPos || Position.Left}
          className="w-3 h-3 !bg-gray-400 hover:!bg-blue-500 transition-colors"
          style={{ left: -6 }}
        />

        <div className="flex items-center justify-center w-full h-full">
           {getStatusIcon()}
        </div>

        {/* Progress Circular Overlay for Running State */}
        {status === 'running' && progress !== undefined && (
          <div className="absolute inset-0 rounded-full border-2 border-orange-200" style={{ clipPath: `inset(${100 - progress}% 0 0 0)` }} />
        )}

        <Handle
          type="source"
          position={data.sourcePos || Position.Right}
          className="w-3 h-3 !bg-gray-400 hover:!bg-blue-500 transition-colors"
          style={{ right: -6 }}
        />
        
        {/* Status Badge (Small indicator) */}
        {status !== 'idle' && status !== 'running' && (
            <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center bg-white shadow-sm`}>
                {status === 'success' && <div className="w-3 h-3 rounded-full bg-green-500" />}
                {status === 'error' && <div className="w-3 h-3 rounded-full bg-red-500" />}
                {status === 'warning' && <div className="w-3 h-3 rounded-full bg-yellow-500" />}
            </div>
        )}
      </div>

      {/* Label & Details */}
      <div className="mt-2 flex flex-col items-center">
        <div className="text-xs font-bold text-gray-700 bg-white/90 px-2 py-0.5 rounded border border-gray-200 text-center shadow-sm max-w-[140px] truncate">
            {data.label}
        </div>
        
        {/* Timestamp or detail line */}
        {data.timestamp && (
            <div className="text-[10px] text-gray-500 mt-0.5">
                {data.timestamp}
            </div>
        )}
        
        {/* Progress Bar (Linear) */}
        {status === 'running' && progress !== undefined && (
            <div className="w-16 h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
                <div 
                    className="h-full bg-orange-500 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>
        )}
      </div>
    </div>
  );
};

export default ProcessNode;
