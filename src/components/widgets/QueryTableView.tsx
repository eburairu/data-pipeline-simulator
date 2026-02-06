/**
 * クエリウィジェット用のテーブルビュー
 */
import React from 'react';
import type { DBRecord } from '../../lib/VirtualDB';

interface QueryTableViewProps {
  /** 表示するレコード一覧 */
  results: DBRecord[];
  /** カラム定義 */
  columns: { name: string; type: string }[];
}

const QueryTableView: React.FC<QueryTableViewProps> = ({ results, columns }) => {
  return (
    <div className="bg-white border rounded shadow-sm overflow-hidden h-full">
      <div className="overflow-auto h-full">
        <table className="w-full text-left text-xs relative">
          <thead className="bg-gray-100 border-b sticky top-0 z-10 shadow-sm">
            <tr>
              {columns.map(c => (
                <th key={c.name} className="p-2 font-semibold text-gray-600 whitespace-nowrap">{c.name}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {results.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-4 text-center text-gray-500 italic">No results found</td>
              </tr>
            ) : (
              results.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  {columns.map(c => (
                    <td key={c.name} className="p-2 truncate max-w-[150px] whitespace-nowrap">
                      {String(r.data[c.name] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default QueryTableView;
