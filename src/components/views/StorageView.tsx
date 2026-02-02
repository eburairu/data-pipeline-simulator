import React from 'react';
import { type VFile } from '../../lib/VirtualFileSystem';

interface StorageViewProps {
  name?: string;
  host: string;
  path: string;
  type: string;
  files: VFile[];
}

export const StorageView = React.memo(({ name, host, path, type, files }: StorageViewProps) => {
  const colorClass = type === 'source' ? 'text-green-600' :
    type === 'topic' ? 'text-purple-600' :
      type === 'incoming' ? 'text-orange-600' : 'text-blue-600';

  const displayPath = type === 'topic' ? '(Topic)' : `${host}:${path}`;
  const title = name ? name : displayPath;

  return (
    <div className="text-xs border border-gray-200 p-2 rounded bg-white shadow-sm h-full flex flex-col">
      <div className="font-semibold text-gray-700 mb-1 flex justify-between items-center" title={`${host}:${path}`}>
        <span className="truncate mr-2">{title}</span>
        {name && <span className="text-gray-400 font-normal text-[10px] truncate max-w-[50%]">{displayPath}</span>}
      </div>
      <ul className="space-y-1 h-24 overflow-y-auto bg-gray-50 p-1 rounded-sm border border-gray-100 flex-grow">
        {files.map(f => (
          <li key={f.name} className={`${colorClass} truncate text-[11px] font-mono`}>{f.name}</li>
        ))}
        {files.length === 0 && <span className="text-gray-400 italic text-[10px] pl-1">Empty</span>}
      </ul>
    </div>
  );
});
