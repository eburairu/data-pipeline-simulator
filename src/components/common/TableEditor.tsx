/**
 * テーブルスキーマ編集コンポーネント
 * DatabaseSettingsから抽出した個別テーブルのカラム管理UI
 */
import React from 'react';
import { Database, Trash2, Plus, Columns } from 'lucide-react';

/** テーブル定義の型 */
interface TableDef {
  id: string;
  name: string;
  columns: { name: string; type: string }[];
}

/** カラム入力状態の型 */
interface ColumnInput {
  name: string;
  type: string;
}

interface TableEditorProps {
  /** テーブル定義 */
  table: TableDef;
  /** カラム追加ハンドラ */
  onAddColumn: (tableId: string) => void;
  /** カラム削除ハンドラ */
  onRemoveColumn: (e: React.MouseEvent, tableId: string, columnName: string) => void;
  /** テーブル削除ハンドラ */
  onRemoveTable: (e: React.MouseEvent, tableId: string, tableName: string) => void;
  /** カラム入力の現在値 */
  columnInput: ColumnInput;
  /** カラム入力変更ハンドラ */
  onColumnInputChange: (tableId: string, field: 'name' | 'type', value: string) => void;
}

const TableEditor: React.FC<TableEditorProps> = ({
  table,
  onAddColumn,
  onRemoveColumn,
  onRemoveTable,
  columnInput,
  onColumnInputChange,
}) => {
  return (
    <div className="border rounded-md bg-gray-50 overflow-hidden">
      {/* テーブルヘッダー */}
      <div className="flex items-center justify-between p-3 bg-gray-100 border-b">
        <div className="flex items-center gap-2 font-medium text-gray-700">
          <Database size={18} />
          <span>{table.name}</span>
          <span className="text-xs text-gray-400 font-normal">({table.id})</span>
        </div>
        <button
          onClick={(e) => onRemoveTable(e, table.id, table.name)}
          className="p-1 rounded text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
          title="Delete Table"
          type="button"
          aria-label={`テーブル ${table.name} を削除`}
        >
          <Trash2 size={18} aria-hidden="true" />
        </button>
      </div>

      {/* カラム一覧 */}
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
                onClick={(e) => onRemoveColumn(e, table.id, col.name)}
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

        {/* カラム追加入力 */}
        <div className="mt-3 flex gap-2 items-center bg-white p-2 rounded border border-dashed border-gray-300">
          <input
            type="text"
            value={columnInput.name}
            onChange={(e) => onColumnInputChange(table.id, 'name', e.target.value)}
            placeholder="Column name"
            aria-label="列名"
            className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none focus:border-purple-400"
            onKeyDown={(e) => e.key === 'Enter' && onAddColumn(table.id)}
          />
          <select
            value={columnInput.type}
            onChange={(e) => onColumnInputChange(table.id, 'type', e.target.value)}
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
            onClick={() => onAddColumn(table.id)}
            disabled={!columnInput.name}
            className="px-3 py-1 bg-purple-50 border border-purple-200 text-purple-700 rounded text-sm hover:bg-purple-100 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={16} /> Add
          </button>
        </div>

        {/* スキーマ概要 */}
        {table.columns.length > 0 && (
          <div className="mt-2 text-xs text-gray-400 flex gap-3">
            <span>{table.columns.length} 列</span>
            <span>型: {[...new Set(table.columns.map(c => c.type))].join(', ')}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TableEditor;
