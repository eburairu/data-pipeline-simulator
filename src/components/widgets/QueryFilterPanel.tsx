/**
 * クエリウィジェット用のフィルタ管理パネル
 */
import React from 'react';
import { Filter, Plus, Trash2 } from 'lucide-react';
import type { DBFilter } from '../../lib/VirtualDB';

interface QueryFilterPanelProps {
  /** 現在のフィルタ一覧 */
  filters: DBFilter[];
  /** 利用可能なカラム一覧 */
  columns: { name: string; type: string }[];
  /** フィルタ追加ハンドラ */
  onAddFilter: () => void;
  /** フィルタ削除ハンドラ */
  onRemoveFilter: (index: number) => void;
  /** フィルタ更新ハンドラ */
  onUpdateFilter: (index: number, field: keyof DBFilter, value: string) => void;
}

const QueryFilterPanel: React.FC<QueryFilterPanelProps> = ({
  filters,
  columns,
  onAddFilter,
  onRemoveFilter,
  onUpdateFilter,
}) => {
  return (
    <div className="bg-gray-50 p-2 rounded border border-gray-100 space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-semibold text-gray-500 flex items-center gap-1 uppercase">
          <Filter size={10} /> Filters (Temp)
        </span>
        <button onClick={onAddFilter} className="text-[10px] flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium">
          <Plus size={10} /> Add
        </button>
      </div>
      {filters.length === 0 && (
        <div className="text-[10px] text-gray-400 italic py-1">No additional filters</div>
      )}
      <div className="space-y-1.5 max-h-[100px] overflow-y-auto">
        {filters.map((f, i) => (
          <div key={i} className="flex gap-1.5 items-center">
            <select
              value={f.column}
              onChange={(e) => onUpdateFilter(i, 'column', e.target.value)}
              className="border rounded p-1 text-[10px] bg-white flex-1 min-w-0"
            >
              {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
            <select
              value={f.operator}
              onChange={(e) => onUpdateFilter(i, 'operator', e.target.value)}
              className="border rounded p-1 text-[10px] bg-white w-[40px]"
            >
              <option value="=">=</option>
              <option value="!=">!=</option>
              <option value=">">&gt;</option>
              <option value="<">&lt;</option>
              <option value=">=">&gt;=</option>
              <option value="<=">&lt;=</option>
              <option value="contains">c.</option>
            </select>
            <input
              type="text"
              value={f.value}
              onChange={(e) => onUpdateFilter(i, 'value', e.target.value)}
              className="border rounded p-1 text-[10px] flex-grow bg-white min-w-0"
              placeholder="Value..."
            />
            <button onClick={() => onRemoveFilter(i)} className="text-red-400 hover:text-red-600 p-1 shrink-0">
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QueryFilterPanel;
