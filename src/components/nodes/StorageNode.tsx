import React from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Folder, Database } from 'lucide-react';

export type StorageNodeData = {
  label: string;
  type: 'fs' | 'db';
  count: number;
  sourcePos?: Position;
  targetPos?: Position;
};

const StorageNode: React.FC<NodeProps<StorageNodeData>> = ({ data }) => {
  return (
    <div className="bg-white border-2 border-gray-300 rounded-md shadow-sm w-40 overflow-hidden">
      <Handle
        type="target"
        position={data.targetPos || Position.Left}
        className="w-3 h-3 bg-gray-400"
      />

      <div className="bg-gray-100 p-2 border-b border-gray-200 flex items-center gap-2">
        {data.type === 'fs' ? (
          <Folder className="w-4 h-4 text-yellow-500" />
        ) : (
          <Database className="w-4 h-4 text-blue-500" />
        )}
        <span className="text-xs font-bold text-gray-700 truncate" title={data.label}>
          {data.label}
        </span>
      </div>

      <div className="p-3 text-center">
        <div className="text-xl font-bold text-gray-800">
          {data.count}
        </div>
        <div className="text-[10px] text-gray-500 uppercase tracking-wider">
          {data.type === 'fs' ? 'Files' : 'Records'}
        </div>
      </div>

      <Handle
        type="source"
        position={data.sourcePos || Position.Right}
        className="w-3 h-3 bg-gray-400"
      />
    </div>
  );
};

export default StorageNode;
