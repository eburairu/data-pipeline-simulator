import React, { useState } from 'react';
import { useTranslation } from '../../lib/i18n/LanguageContext';
import { List, Grid3X3 } from 'lucide-react';
import type { TableDefinition, ColumnDefinition } from '../../lib/types';
import type { DBRecord } from '../../lib/VirtualDB';

interface DatabaseViewProps {
  tables: TableDefinition[];
  select: (tableName: string) => DBRecord[];
}

export const DatabaseView: React.FC<DatabaseViewProps> = ({ tables, select }) => {
  const { t } = useTranslation();
  const [dbViewMode, setDbViewMode] = useState<'text' | 'table'>('table');
  return (
    <div className="border p-2 sm:p-3 rounded bg-gray-50/50">
      <div className="flex justify-between items-center mb-2 border-b pb-1">
        <h3 className="font-bold text-gray-700 flex items-center gap-2 text-xs sm:text-sm"><span className="w-2 h-2 rounded-full bg-gray-600"></span> {t('app.storage.database')}</h3>
        <div className="flex bg-white rounded border p-0.5">
          <button onClick={() => setDbViewMode('text')} className={`p-1 rounded ${dbViewMode === 'text' ? 'bg-gray-200' : 'text-gray-400'}`} aria-label="リスト表示" aria-pressed={dbViewMode === 'text'}><List size={12} aria-hidden="true" /></button>
          <button onClick={() => setDbViewMode('table')} className={`p-1 rounded ${dbViewMode === 'table' ? 'bg-gray-200' : 'text-gray-400'}`} aria-label="テーブル表示" aria-pressed={dbViewMode === 'table'}><Grid3X3 size={12} aria-hidden="true" /></button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {tables.map((table) => {
          const allRecords = select(table.name);
          const MAX_DISPLAY_RECORDS = 100;
          const hasMore = allRecords.length > MAX_DISPLAY_RECORDS;
          const records = hasMore ? allRecords.slice(0, MAX_DISPLAY_RECORDS) : allRecords;
          const hiddenCount = allRecords.length - records.length;
          return (
            <div key={table.id} className="text-xs border border-gray-200 p-2 rounded bg-white shadow-sm flex flex-col">
              <h4 className="font-semibold text-gray-700 mb-1 truncate flex justify-between items-center" title={table.name}>
                <span>{table.name}</span>
                <span className="text-[10px] text-gray-400 font-normal">{allRecords.length} rows</span>
              </h4>
              <div className="h-32 sm:h-48 overflow-auto bg-gray-50 p-1 rounded-sm border border-gray-100 flex-grow relative">
                {dbViewMode === 'text' ? (
                  records.length === 0 ? <span className="text-gray-400 italic text-[10px]">No records</span> :
                    <ul className="space-y-1">{records.map((r) => <li key={r.id} className="truncate text-[10px] sm:text-[11px] font-mono">{JSON.stringify(r.data)}</li>)}</ul>
                ) : (
                  <table className="w-full text-left border-collapse min-w-[300px]">
                    <thead className="bg-gray-100 sticky top-0"><tr>{Object.keys(records[0]?.data || table.columns.reduce((a: Record<string, string>, c: ColumnDefinition) => ({ ...a, [c.name]: '' }), {})).map((k) => <th key={k} className="p-1 border-b text-[10px]">{k}</th>)}</tr></thead>
                    <tbody>{records.map((r, i) => <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>{Object.keys(r.data).map((k) => <td key={k} className="p-1 border-b truncate max-w-[80px] text-[10px]">{String(r.data[k])}</td>)}</tr>)}</tbody>
                  </table>
                )}
              </div>
              {hasMore && (
                <div className="mt-1 text-[10px] text-amber-600 bg-amber-50 rounded px-2 py-0.5 text-center">
                  +{hiddenCount} more records (showing first {MAX_DISPLAY_RECORDS})
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  )
}
