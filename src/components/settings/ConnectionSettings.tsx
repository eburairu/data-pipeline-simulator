import React from 'react';
import { useSettings, type ConnectionDefinition, type ConnectionType } from '../../lib/SettingsContext';
import { Trash2, Plus, Database, FileText, Server } from 'lucide-react';

const ConnectionSettings: React.FC = () => {
  const { connections, addConnection, removeConnection, updateConnection, hosts } = useSettings();

  const handleAdd = () => {
    addConnection({
      name: 'New Connection',
      type: 'file',
      host: hosts.length > 0 ? hosts[0].name : 'localhost'
    });
  };

  const handleChange = (id: string, updates: Partial<ConnectionDefinition>) => {
    updateConnection(id, updates);
  };

  const handleTypeChange = (id: string, newType: ConnectionType) => {
    // Reset specific fields when type changes
    const defaultHost = hosts.length > 0 ? hosts[0].name : 'localhost';
    updateConnection(id, { type: newType, host: defaultHost });
  };


  return (
    <div className="space-y-4 p-4 border rounded bg-white shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 flex items-center gap-2">
        <Server className="w-5 h-5" /> Connections
      </h3>
      <p className="text-xs text-gray-500">Define host connections. Specific paths/tables are configured in each job.</p>

      <div className="space-y-4">
        {connections.map((conn) => (
          <div key={conn.id} className="border p-4 rounded-md bg-gray-50 relative">
             <div className="absolute top-2 right-2">
                <button onClick={() => removeConnection(conn.id)} className="text-red-500 hover:text-red-700" title="Delete Connection">
                  <Trash2 size={18} />
                </button>
             </div>

             <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                   <div>
                     <label className="block text-xs font-medium text-gray-500">Connection Name</label>
                     <input
                        type="text"
                        value={conn.name}
                        onChange={(e) => handleChange(conn.id, { name: e.target.value })}
                        className="w-full border rounded p-1 text-sm"
                     />
                   </div>
                   <div>
                     <label className="block text-xs font-medium text-gray-500">Type</label>
                     <div className="flex gap-2 mt-1">
                        <button
                            onClick={() => handleTypeChange(conn.id, 'file')}
                            className={`flex items-center gap-1 px-3 py-1 rounded text-xs border ${conn.type === 'file' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white text-gray-600'}`}
                        >
                            <FileText size={14} /> File
                        </button>
                        <button
                             onClick={() => handleTypeChange(conn.id, 'database')}
                             className={`flex items-center gap-1 px-3 py-1 rounded text-xs border ${conn.type === 'database' ? 'bg-purple-100 border-purple-300 text-purple-700' : 'bg-white text-gray-600'}`}
                        >
                            <Database size={14} /> Database
                        </button>
                     </div>
                   </div>
                </div>

                <div className={`grid grid-cols-1 gap-3 p-2 rounded border ${conn.type === 'file' ? 'bg-blue-50 border-blue-100' : 'bg-purple-50 border-purple-100'}`}>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Host</label>
                    <select
                      value={conn.host || ''}
                      onChange={(e) => handleChange(conn.id, { host: e.target.value })}
                      className="w-full border rounded p-1 text-sm bg-white"
                    >
                      {hosts.map(h => (
                        <option key={h.name} value={h.name}>{h.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
             </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleAdd}
        className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-500 hover:text-blue-500 transition-colors"
      >
        <Plus size={20} /> Add Connection
      </button>
    </div>
  );
};

export default ConnectionSettings;
