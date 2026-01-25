import React from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Settings, Loader2 } from 'lucide-react';

export type ProcessNodeData = {
  label: string;
  isProcessing: boolean;
  sourcePos?: Position;
  targetPos?: Position;
};

const ProcessNode: React.FC<NodeProps<ProcessNodeData>> = ({ data }) => {
  return (
    <div className="flex flex-col items-center justify-center">
       <div className={`relative flex items-center justify-center w-16 h-16 rounded-full border-2 shadow-sm transition-all duration-300 ${
         data.isProcessing
           ? 'bg-orange-100 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]'
           : 'bg-blue-100 border-blue-500'
       }`}>
        <Handle
          type="target"
          position={data.targetPos || Position.Left}
          style={{ opacity: 0 }}
        />

        {data.isProcessing ? (
           <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
        ) : (
           <Settings className="w-8 h-8 text-blue-600" />
        )}

        <Handle
          type="source"
          position={data.sourcePos || Position.Right}
          style={{ opacity: 0 }}
        />
      </div>

      <div className="mt-2 text-xs font-medium text-gray-600 bg-white/80 px-2 py-0.5 rounded border border-gray-200 text-center max-w-[120px]">
        {data.label}
      </div>
    </div>
  );
};

export default ProcessNode;
