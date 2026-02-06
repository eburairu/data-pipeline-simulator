import React, { useState, useCallback } from 'react';
import { useSettings } from '../../lib/SettingsContext';
import { Database, Trash2, Plus, AlertTriangle, X } from 'lucide-react';
import TableEditor from '../common/TableEditor';

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
        [tableId]: { name: '', type: 'string' }
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
          <TableEditor
            key={table.id}
            table={table}
            onAddColumn={handleAddColumn}
            onRemoveColumn={handleRemoveColumn}
            onRemoveTable={handleRemoveTable}
            columnInput={newColumnInputs[table.id] || { name: '', type: 'string' }}
            onColumnInputChange={handleColumnInputChange}
          />
        ))}
      </div>

      {/* テーブル追加セクション */}
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

      {/* 削除確認モーダル */}
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
