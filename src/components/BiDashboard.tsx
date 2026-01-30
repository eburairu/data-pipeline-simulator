import React, { useState, useEffect, useMemo } from 'react';
import { useVirtualDB, type DBFilter, type DBRecord } from '../lib/VirtualDB';
import { useSettings } from '../lib/SettingsContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Play, Plus, Trash2, Filter, Table as TableIcon, Activity } from 'lucide-react';

const BiDashboard: React.FC = () => {
  const { tables } = useSettings();
  const { query } = useVirtualDB();

  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [filters, setFilters] = useState<DBFilter[]>([]);
  const [viewType, setViewType] = useState<'table' | 'chart'>('table');
  const [xAxis, setXAxis] = useState<string>('');
  const [yAxis, setYAxis] = useState<string>('');
  const [results, setResults] = useState<DBRecord[]>([]);
  const [hasRun, setHasRun] = useState(false);

  const selectedTableDef = tables.find(t => t.id === selectedTableId);
  const columns = selectedTableDef ? selectedTableDef.columns : [];

  const handleRunQuery = () => {
    if (!selectedTableDef) return;
    const res = query(selectedTableDef.name, filters);
    setResults(res);
    setHasRun(true);
  };

  const addFilter = () => {
    if (columns.length > 0) {
      setFilters([...filters, { column: columns[0].name, operator: '=', value: '' }]);
    }
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const updateFilter = (index: number, field: keyof DBFilter, value: string) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], [field]: value };
    setFilters(newFilters);
  };

  // Reset state when table changes
  useEffect(() => {
      setFilters([]);
      setResults([]);
      setHasRun(false);
      if (columns.length > 0) {
          setXAxis(columns[0].name);
          // Find first numeric column for Y axis default, or just first column
          const numericCol = columns.find(c => c.type === 'number' || c.type === 'integer' || c.type === 'decimal');
          setYAxis(numericCol ? numericCol.name : columns[0].name);
      }
  }, [selectedTableId, columns]);

  const chartData = useMemo(() => {
      if (viewType !== 'chart') return [];
      return results.map(r => {
          const d: any = { ...r.data };
          // Ensure numeric Y
           if (yAxis) {
               const val = Number(d[yAxis]);
               d[yAxis] = isNaN(val) ? null : val;
           }
          return d;
      });
  }, [results, viewType, yAxis]);

  return (
    <div className="flex flex-col h-full bg-white rounded shadow border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
             <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                <Activity className="w-5 h-5" /> BI Dashboard
             </h2>
        </div>

        {/* Controls */}
        <div className="p-4 border-b space-y-4">
            <div className="flex gap-4 flex-wrap items-end">
                {/* Table Select */}
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-500">Table</label>
                    <select
                        className="border rounded p-1.5 text-sm min-w-[200px]"
                        value={selectedTableId}
                        onChange={(e) => setSelectedTableId(e.target.value)}
                    >
                        <option value="">-- Select Table --</option>
                        {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>

                {/* View Type */}
                <div className="flex bg-gray-100 p-1 rounded gap-1">
                    <button
                        onClick={() => setViewType('table')}
                        className={`px-3 py-1 text-sm rounded flex items-center gap-1 ${viewType === 'table' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}
                    >
                        <TableIcon size={14} /> Table
                    </button>
                    <button
                        onClick={() => setViewType('chart')}
                        className={`px-3 py-1 text-sm rounded flex items-center gap-1 ${viewType === 'chart' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}
                    >
                        <Activity size={14} /> Chart
                    </button>
                </div>

                {/* Execute */}
                <button
                    onClick={handleRunQuery}
                    disabled={!selectedTableId}
                    className={`ml-auto px-4 py-1.5 rounded flex items-center gap-2 text-sm font-semibold transition-colors ${!selectedTableId ? 'bg-gray-200 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                    <Play size={14} /> Run Query
                </button>
            </div>

            {/* Filters */}
            {selectedTableDef && (
                <div className="bg-gray-50 p-3 rounded border space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-gray-500 flex items-center gap-1"><Filter size={12}/> Filters</span>
                        <button onClick={addFilter} className="text-xs flex items-center gap-1 text-blue-600 hover:underline"><Plus size={12}/> Add Filter</button>
                    </div>
                    {filters.length === 0 && <div className="text-xs text-gray-400 italic">No filters applied</div>}
                    <div className="space-y-2">
                        {filters.map((f, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <select
                                    value={f.column}
                                    onChange={(e) => updateFilter(i, 'column', e.target.value)}
                                    className="border rounded p-1 text-sm bg-white"
                                >
                                    {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                </select>
                                <select
                                    value={f.operator}
                                    onChange={(e) => updateFilter(i, 'operator', e.target.value as any)}
                                    className="border rounded p-1 text-sm bg-white"
                                >
                                    <option value="=">=</option>
                                    <option value="!=">!=</option>
                                    <option value=">">&gt;</option>
                                    <option value="<">&lt;</option>
                                    <option value=">=">&gt;=</option>
                                    <option value="<=">&lt;=</option>
                                    <option value="contains">contains</option>
                                </select>
                                <input
                                    type="text"
                                    value={f.value}
                                    onChange={(e) => updateFilter(i, 'value', e.target.value)}
                                    className="border rounded p-1 text-sm flex-grow bg-white"
                                    placeholder="Value..."
                                />
                                <button onClick={() => removeFilter(i)} className="text-red-500 hover:text-red-700"><Trash2 size={14}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Chart Config */}
            {selectedTableDef && viewType === 'chart' && (
                <div className="flex gap-4 items-center bg-blue-50 p-2 rounded border border-blue-100">
                    <span className="text-xs font-semibold text-blue-800">Chart Settings:</span>
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-blue-600">X-Axis</label>
                        <select value={xAxis} onChange={e => setXAxis(e.target.value)} className="border rounded p-1 text-sm bg-white">
                            {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-blue-600">Y-Axis</label>
                        <select value={yAxis} onChange={e => setYAxis(e.target.value)} className="border rounded p-1 text-sm bg-white">
                            {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                        </select>
                    </div>
                </div>
            )}
        </div>

        {/* Content */}
        <div className="flex-grow overflow-auto p-4 bg-gray-50/50">
            {!hasRun && <div className="h-full flex items-center justify-center text-gray-400 italic">Select a table and run query to see results</div>}

            {hasRun && viewType === 'table' && (
                <div className="bg-white border rounded shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100 border-b">
                                <tr>
                                    {columns.map(c => <th key={c.name} className="p-2 font-semibold text-gray-600">{c.name}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {results.length === 0 ? (
                                    <tr><td colSpan={columns.length} className="p-4 text-center text-gray-500 italic">No results found</td></tr>
                                ) : (
                                    results.map(r => (
                                        <tr key={r.id} className="hover:bg-gray-50">
                                            {columns.map(c => <td key={c.name} className="p-2 truncate max-w-[200px]">{String(r.data[c.name] ?? '')}</td>)}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {hasRun && viewType === 'chart' && (
                <div className="bg-white border rounded shadow-sm p-4 h-full min-h-[300px]">
                    {results.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-gray-500 italic">No results found</div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey={xAxis} />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey={yAxis} stroke="#2563eb" activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};

export default BiDashboard;
