import React, { useState } from 'react';
import { useSettings } from '../../lib/SettingsContext';
import { Trash2, Plus, Server, Folder } from 'lucide-react';

const InfrastructureSettings: React.FC = () => {
  const {
    hosts,
    addHost,
    removeHost,
    addDirectory,
    removeDirectory,
    isHostInUse,
    isDirectoryInUse
  } = useSettings();

  const [newHostName, setNewHostName] = useState('');
  const [newDirPaths, setNewDirPaths] = useState<{ [key: string]: string }>({});

  const handleAddHost = () => {
    if (newHostName.trim()) {
      addHost(newHostName.trim());
      setNewHostName('');
    }
  };

  const handleRemoveHost = (hostName: string) => {
    if (isHostInUse(hostName)) {
      alert(`Cannot delete host "${hostName}" because it is currently in use by one or more jobs.`);
      return;
    }
    if (window.confirm(`Are you sure you want to delete host "${hostName}"?`)) {
      removeHost(hostName);
    }
  };

  const handleAddDirectory = (hostName: string) => {
    const path = newDirPaths[hostName];
    if (path && path.trim()) {
      // Ensure path starts with / and no trailing slash for consistency
      let cleanPath = path.trim();
      if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath;
      if (cleanPath.length > 1 && cleanPath.endsWith('/')) cleanPath = cleanPath.slice(0, -1);

      addDirectory(hostName, cleanPath);
      setNewDirPaths(prev => ({ ...prev, [hostName]: '' }));
    }
  };

  const handleRemoveDirectory = (hostName: string, path: string) => {
    if (isDirectoryInUse(hostName, path)) {
      alert(`Cannot delete directory "${path}" on "${hostName}" because it is currently in use.`);
      return;
    }
    if (window.confirm(`Are you sure you want to delete directory "${path}" from "${hostName}"?`)) {
      removeDirectory(hostName, path);
    }
  };

  return (
    <div className="space-y-6 p-4 border rounded bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b pb-2">
        <Server className="text-blue-600" size={24} />
        <h3 className="text-lg font-semibold text-gray-800">Infrastructure Settings</h3>
      </div>

      <div className="space-y-6">
        {hosts.map((host) => (
          <div key={host.name} className="border rounded-md bg-gray-50 overflow-hidden">
            {/* Host Header */}
            <div className="flex items-center justify-between p-3 bg-gray-100 border-b">
              <div className="flex items-center gap-2 font-medium text-gray-700">
                <Server size={18} />
                <span>{host.name}</span>
              </div>
              <button
                onClick={() => handleRemoveHost(host.name)}
                className={`p-1 rounded transition-colors ${
                  isHostInUse(host.name)
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-red-500 hover:bg-red-50 hover:text-red-700'
                }`}
                title={isHostInUse(host.name) ? "Host is in use" : "Delete Host"}
                disabled={isHostInUse(host.name)}
              >
                <Trash2 size={18} />
              </button>
            </div>

            {/* Directory List */}
            <div className="p-3 space-y-2">
              <div className="space-y-2">
                {host.directories.map((dir) => (
                  <div key={dir} className="flex items-center justify-between bg-white p-2 rounded border text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Folder size={16} className="text-yellow-500" />
                      <span>{dir}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveDirectory(host.name, dir)}
                      className={`p-1 rounded transition-colors ${
                        isDirectoryInUse(host.name, dir)
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-red-400 hover:text-red-600'
                      }`}
                      title={isDirectoryInUse(host.name, dir) ? "Directory is in use" : "Delete Directory"}
                      disabled={isDirectoryInUse(host.name, dir)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Directory Input */}
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={newDirPaths[host.name] || ''}
                  onChange={(e) => setNewDirPaths(prev => ({ ...prev, [host.name]: e.target.value }))}
                  placeholder="/new/path"
                  className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddDirectory(host.name)}
                />
                <button
                  onClick={() => handleAddDirectory(host.name)}
                  className="px-3 py-1 bg-white border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50 hover:text-blue-600 flex items-center gap-1"
                >
                  <Plus size={16} /> Add Dir
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Host Section */}
      <div className="pt-4 border-t">
        <label className="block text-sm font-medium text-gray-700 mb-2">Add New Host</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newHostName}
            onChange={(e) => setNewHostName(e.target.value)}
            placeholder="e.g., server-db-1"
            className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            onKeyDown={(e) => e.key === 'Enter' && handleAddHost()}
          />
          <button
            onClick={handleAddHost}
            disabled={!newHostName.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Plus size={18} /> Add Host
          </button>
        </div>
      </div>
    </div>
  );
};

export default InfrastructureSettings;
