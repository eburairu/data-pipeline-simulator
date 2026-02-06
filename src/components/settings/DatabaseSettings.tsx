import React, { useState, useCallback } from 'react';
import { useSettings } from '../../lib/SettingsContext';
import { Database, Trash2, Plus, Columns, AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmation {
  type: 'table' | 'column';
  tableId: string;
  tableName?: string;
  columnName?: string;
}

const DatabaseSettings: React.FC = () => {
  const { tables, addTable, removeTable, addColumn, removeColumn } = useSettings();
  const [newTableName, setNewTableName] = useState('');
  const [newColumnInputs, setNewColumnInputs] = useState<{ [tableId: string]: { name: string, type: string } }>({});
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation | null>(null);

  const handleAddTable = () => {
    if (newTableName.trim()) {
      addTable(newTableName.trim());
      setNewTableName('');
    }
  };

  const handleRemoveTable = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    e.preventDefault();
    setDeleteConfirmation({ type: 'table', tableId: id, tableName: name });
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

  const handleRemoveColumn = (e: React.MouseEvent, tableId: string, columnName: string) => {
    e.stopPropagation();
    e.preventDefault();
    setDeleteConfirmation({ type: 'column', tableId, columnName });
  };

  const confirmDelete = useCallback(() => {
    if (!deleteConfirmation) return;

    if (deleteConfirmation.type === 'table') {
      removeTable(deleteConfirmation.tableId);
    } else if (deleteConfirmation.type === 'column' && deleteConfirmation.columnName) {
      removeColumn(deleteConfirmation.tableId, deleteConfirmation.columnName);
    }
    setDeleteConfirmation(null);
  }, [deleteConfirmation, removeTable, removeColumn]);

  const cancelDelete = useCallback(() => {
    setDeleteConfirmation(null);
  }, []);

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
                onClick={(e) => handleRemoveTable(e, table.id, table.name)}
                className="p-1 rounded text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                title="Delete Table"
                type="button"
                aria-label={`テーブル ${table.name} を削除`}
              >
                <Trash2 size={18} aria-hidden="true" />
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
                      onClick={(e) => handleRemoveColumn(e, table.id, col.name)}
                      className="p-1 rounded text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete Column"
                      type="button"
                      aria-label={`列 ${col.name} を削除`}
                    >
                      <Trash2 size={16} aria-hidden="true" />
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
                  aria-label="列名"
                  className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none focus:border-purple-400"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddColumn(table.id)}
                />
                <select
                  value={newColumnInputs[table.id]?.type || 'string'}
                  onChange={(e) => handleColumnInputChange(table.id, 'type', e.target.value)}
                  className="border rounded px-2 py-1 text-sm focus:outline-none focus:border-purple-400 bg-white"
                  aria-label="列の型"
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
        <label htmlFor="new-table-name" className="block text-sm font-medium text-gray-700 mb-2">Create New Table</label>
        <div className="flex gap-2">
          <input
            id="new-table-name"
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-title"
          onClick={cancelDelete}
          onKeyDown={(e) => e.key === 'Escape' && cancelDelete()}
        >
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="text-red-600" size={24} aria-hidden="true" />
              </div>
              <h3 id="delete-confirm-title" className="text-lg font-semibold text-gray-900">Confirm Deletion</h3>
            </div>

            <p className="text-gray-600 mb-6">
              {deleteConfirmation.type === 'table'
                ? `Are you sure you want to delete table "${deleteConfirmation.tableName}"? This action cannot be undone.`
                : `Are you sure you want to delete column "${deleteConfirmation.columnName}"?`
              }
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2"
                type="button"
              >
                <X size={16} />
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-2"
                type="button"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseSettings;
