import React, { useState } from 'react';
import { useSettings } from '../../lib/SettingsContext';
import { Database, Trash2, Plus, Columns } from 'lucide-react';

const DatabaseSettings: React.FC = () => {
  const { tables, addTable, removeTable, addColumn, removeColumn } = useSettings();
  const [newTableName, setNewTableName] = useState('');
  const [newColumnInputs, setNewColumnInputs] = useState<{ [tableId: string]: { name: string, type: string } }>({});

  const handleAddTable = () => {
    if (newTableName.trim()) {
      addTable(newTableName.trim());
      setNewTableName('');
    }
  };

  const handleRemoveTable = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete table "${name}"?`)) {
      removeTable(id);
    }
  };

  const handleColumnInputChange = (tableId: string, field: 'name' | 'type', value: string) => {
    setNewColumnInputs(prev => ({
      ...prev,
      [tableId]: {
        ...(prev[tableId] || { name: '', type: 'string' }),
        [field]: value
      }
    }));
  };

  const handleAddColumn = (tableId: string) => {
    const input = newColumnInputs[tableId];
    if (input && input.name.trim()) {
      addColumn(tableId, input.name.trim(), input.type || 'string');
      setNewColumnInputs(prev => ({
        ...prev,
        [tableId]: { name: '', type: 'string' } // Reset only name, keep type default
      }));
    }
  };

  const handleRemoveColumn = (tableId: string, columnName: string) => {
    if (window.confirm(`Delete column "${columnName}"?`)) {
      removeColumn(tableId, columnName);
    }
  };

  return (
    <div className="space-y-6 p-4 border rounded bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b pb-2">
        <Database className="text-purple-600" size={24} />
        <h3 className="text-lg font-semibold text-gray-800">Database Schema Settings</h3>
      </div>

      <div className="space-y-6">
        {tables.map((table) => (
          <div key={table.id} className="border rounded-md bg-gray-50 overflow-hidden">
            {/* Table Header */}
            <div className="flex items-center justify-between p-3 bg-gray-100 border-b">
              <div className="flex items-center gap-2 font-medium text-gray-700">
                <Database size={18} />
                <span>{table.name}</span>
                <span className="text-xs text-gray-400 font-normal">({table.id})</span>
              </div>
              <button
                onClick={() => handleRemoveTable(table.id, table.name)}
                className="p-1 rounded text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                title="Delete Table"
              >
                <Trash2 size={18} />
              </button>
            </div>

            {/* Columns List */}
            <div className="p-3 space-y-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Columns size={12} /> Columns
              </div>

              {table.columns.length === 0 && (
                <div className="text-sm text-gray-400 italic pl-2">No columns defined</div>
              )}

              <div className="space-y-2">
                {table.columns.map((col) => (
                  <div key={col.name} className="flex items-center justify-between bg-white p-2 rounded border text-sm">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-700">{col.name}</span>
                      <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border">
                        {col.type}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveColumn(table.id, col.name)}
                      className="p-1 rounded text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete Column"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Column Input */}
              <div className="mt-3 flex gap-2 items-center bg-white p-2 rounded border border-dashed border-gray-300">
                <input
                  type="text"
                  value={newColumnInputs[table.id]?.name || ''}
                  onChange={(e) => handleColumnInputChange(table.id, 'name', e.target.value)}
                  placeholder="Column name"
                  className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none focus:border-purple-400"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddColumn(table.id)}
                />
                <select
                  value={newColumnInputs[table.id]?.type || 'string'}
                  onChange={(e) => handleColumnInputChange(table.id, 'type', e.target.value)}
                  className="border rounded px-2 py-1 text-sm focus:outline-none focus:border-purple-400 bg-white"
                >
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                  <option value="date">Date</option>
                  <option value="json">JSON</option>
                </select>
                <button
                  onClick={() => handleAddColumn(table.id)}
                  disabled={!newColumnInputs[table.id]?.name}
                  className="px-3 py-1 bg-purple-50 border border-purple-200 text-purple-700 rounded text-sm hover:bg-purple-100 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={16} /> Add
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Table Section */}
      <div className="pt-4 border-t">
        <label className="block text-sm font-medium text-gray-700 mb-2">Create New Table</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTableName}
            onChange={(e) => setNewTableName(e.target.value)}
            placeholder="e.g., customers"
            className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-400"
            onKeyDown={(e) => e.key === 'Enter' && handleAddTable()}
          />
          <button
            onClick={handleAddTable}
            disabled={!newTableName.trim()}
            className="px-4 py-2 bg-purple-600 text-white rounded text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Plus size={18} /> Add Table
          </button>
        </div>
      </div>
    </div>
  );
};

export default DatabaseSettings;
