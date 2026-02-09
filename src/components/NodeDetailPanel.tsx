import React from 'react';
import { X, FileText, Database, Activity, Clock } from 'lucide-react';
import { useFileSystem } from '../lib/VirtualFileSystem';
import { useVirtualDB } from '../lib/VirtualDB';
import { getNodeStatusColor, getNodeStatusIcon } from '../lib/statusUtils';
import ProgressBar from './common/ProgressBar';
import type { ProcessNodeData } from './nodes/ProcessNode';
import type { StorageNodeData } from './nodes/StorageNode';
import type { Node } from 'reactflow';

interface NodeDetailPanelProps {
  node: Node<ProcessNodeData | StorageNodeData> | null;
  onClose: () => void;
}

const NodeDetailPanel: React.FC<NodeDetailPanelProps> = ({ node, onClose }) => {
  const { listFiles } = useFileSystem();
  const { select } = useVirtualDB();

  if (!node) return null;

  const isStorage = node.type === 'storage';
  const data = node.data;

  // Helper to get detailed content
  const renderContent = () => {
    if (isStorage) {
      const storageData = data as StorageNodeData;
      let items: string[] = [];
      
      try {
        if (storageData.type === 'fs') {
          // Parse host:path from label or explicit path if available
          // Expected label format "host:path"
          const parts = storageData.label.split(':');
          if (parts.length >= 2) {
             const host = parts[0];
             const path = parts.slice(1).join(':');
             items = listFiles(host, path).slice(0, 10).map(f => f.name);
          }
        } else {
          // DB format "DB: tableName"
          const tableName = storageData.label.replace('DB: ', '');
          const rows = select(tableName).slice(0, 5);
          items = rows.map(r => JSON.stringify(r));
        }
      } catch (e) {
        items = ['Error loading items'];
      }

      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-gray-600">
            {storageData.type === 'fs' ? <FileText size={18} /> : <Database size={18} />}
            <span className="font-medium">{storageData.type === 'fs' ? 'File System' : 'Database Table'}</span>
          </div>
          
          <div className="bg-gray-50 rounded p-3 border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">Current Count</div>
            <div className="text-2xl font-bold text-gray-800">{storageData.count.toLocaleString()}</div>
            {storageData.capacity && (
                <ProgressBar 
                  percent={(storageData.count / storageData.capacity) * 100}
                  colorClass="bg-blue-500"
                  className="mt-2"
                />
            )}
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Recent Items (Top 10)</h4>
            {items.length > 0 ? (
              <ul className="text-xs text-gray-600 bg-white border rounded divide-y max-h-40 overflow-y-auto">
                {items.map((item, idx) => (
                  <li key={idx} className="p-2 hover:bg-gray-50 truncate font-mono">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
                <div className="text-xs text-gray-400 italic">No items found.</div>
            )}
          </div>
        </div>
      );
    } else {
      const processData = data as ProcessNodeData;
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-gray-600">
            <Activity size={18} />
            <span className="font-medium">Process Job</span>
          </div>

          <div className={`p-3 rounded border ${getNodeStatusColor(processData.status)}`}>
             <div className="flex items-center gap-2 mb-2">
                <div className="transform scale-50 -ml-2 -mr-2">
                  {getNodeStatusIcon(processData.status, <Activity size={16} />)}
                </div>
                <span className="capitalize font-bold text-sm text-gray-800">{processData.status}</span>
             </div>
             
             {processData.progress !== undefined && (
                <ProgressBar 
                  percent={processData.progress}
                  colorClass={processData.status === 'error' ? 'bg-red-500' : 'bg-orange-500'}
                  heightClass="h-2"
                  className="mt-2"
                />
             )}
          </div>

          {processData.timestamp && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock size={14} />
                  <span>Last Updated: {processData.timestamp}</span>
              </div>
          )}
          
          <div className="text-xs text-gray-400 mt-4">
            Configuration details can be viewed in the Settings page.
          </div>
        </div>
      );
    }
  };

  return (
    <div className="absolute top-4 right-4 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 flex flex-col max-h-[80vh] animate-in slide-in-from-right-10 duration-200">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-lg">
        <h3 className="font-bold text-gray-800 truncate pr-4" title={data.label}>{data.label}</h3>
        <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded text-gray-500 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
      <div className="p-4 overflow-y-auto flex-1">
        {renderContent()}
      </div>
    </div>
  );
};

export default NodeDetailPanel;