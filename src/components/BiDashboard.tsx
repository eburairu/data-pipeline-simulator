import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useVirtualDB, type DBFilter, type DBRecord } from '../lib/VirtualDB';
import { useSettings, type DashboardItem } from '../lib/SettingsContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Play, Plus, Trash2, Filter, Table as TableIcon, Activity, AlertTriangle } from 'lucide-react';
import { TIMEOUTS } from '../lib/constants';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-red-500 bg-red-50 text-red-700 rounded h-full overflow-auto flex flex-col items-start">
          <h3 className="font-bold flex items-center gap-2"><AlertTriangle size={16} /> Visualization Error</h3>
          <p className="text-sm mt-2">An error occurred while rendering the dashboard.</p>
          <div className="text-xs mt-2 bg-white p-2 border rounded overflow-x-auto w-full text-left">
            <p className="font-semibold">{this.state.error?.message}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

interface DashboardWidgetProps {
  item: DashboardItem;
}

const DashboardWidget: React.FC<DashboardWidgetProps> = ({ item }) => {
  const { tables } = useSettings();
  const { query } = useVirtualDB();

  const [selectedTableId, setSelectedTableId] = useState<string>(item.tableId);
  const [filters, setFilters] = useState<DBFilter[]>(item.filters || []);
  const [viewType, setViewType] = useState<'table' | 'chart'>(item.viewType);
  const [xAxis, setXAxis] = useState<string>(item.chartConfig?.xAxis || '');
  const [yAxis, setYAxis] = useState<string>(item.chartConfig?.yAxis || '');
  const [results, setResults] = useState<DBRecord[]>([]);
  const [hasRun, setHasRun] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const prevTableIdRef = useRef(item.tableId);

  // Safety check for context
  if (!tables) {
    return <div className="h-full flex items-center justify-center text-gray-500 italic">Tables configuration not available.</div>;
  }

  const selectedTableDef = tables.find(t => t.id === selectedTableId);
  const columns = selectedTableDef ? selectedTableDef.columns : [];

  const handleRunQuery = () => {
    if (!selectedTableDef) return;
    try {
      const res = query(selectedTableDef.name, filters);
      setResults(res);
      setHasRun(true);
    } catch (e) {
      console.error("Query execution failed", e);
    }
  };

  // Keep a ref to the latest handler to avoid stale closures in intervals
  const handleRunQueryRef = useRef(handleRunQuery);
  useEffect(() => {
    handleRunQueryRef.current = handleRunQuery;
  });

  // Run automatically on mount if configured
  useEffect(() => {
      if (selectedTableId) {
          handleRunQuery();
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh logic (Settings)
  useEffect(() => {
    if (item.refreshInterval > 0 && selectedTableId && !autoRefresh) {
        const interval = setInterval(() => handleRunQueryRef.current(), item.refreshInterval);
        return () => clearInterval(interval);
    }
  }, [item.refreshInterval, selectedTableId, autoRefresh]);

  // Auto-refresh logic (Manual Toggle 1s)
  useEffect(() => {
    if (autoRefresh && selectedTableId) {
        const interval = setInterval(() => handleRunQueryRef.current(), TIMEOUTS.DASHBOARD_AUTO_REFRESH);
        return () => clearInterval(interval);
    }
  }, [autoRefresh, selectedTableId]);

  // Update xAxis/yAxis defaults if columns change and not set
  useEffect(() => {
      if (columns.length > 0) {
          if (!xAxis) setXAxis(columns[0].name);
          if (!yAxis) {
            const numericCol = columns.find(c => c.type === 'number' || c.type === 'integer' || c.type === 'decimal');
            setYAxis(numericCol ? numericCol.name : columns[0].name);
          }
      }
  }, [selectedTableId, columns, xAxis, yAxis]);

  // Reset state when table changes (only if changed by user, not initial load)
  useEffect(() => {
    if (prevTableIdRef.current !== selectedTableId) {
        setFilters([]);
        setResults([]);
        setHasRun(false);
        if (columns.length > 0) {
            setXAxis(columns[0].name);
            const numericCol = columns.find(c => c.type === 'number' || c.type === 'integer' || c.type === 'decimal');
            setYAxis(numericCol ? numericCol.name : columns[0].name);
        }
        prevTableIdRef.current = selectedTableId;
    }
  }, [selectedTableId, columns]);

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

  const chartData = useMemo(() => {
    if (viewType !== 'chart') return [];
    return results.map(r => {
      const d: Record<string, unknown> = { ...r.data };
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
        <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
             <h2 className="text-base font-bold flex items-center gap-2 text-gray-800 truncate" title={item.title}>
                <Activity className="w-4 h-4 text-blue-600" /> {item.title || selectedTableDef?.name || 'Dashboard Widget'}
             </h2>
        </div>

        {/* Controls */}
        <div className="p-2 border-b space-y-2">
            <div className="flex flex-col xl:flex-row gap-2 xl:items-end">
                {/* Table Select (Read-onlyish or editable for temp view) */}
                <div className="flex flex-col gap-0.5 w-full xl:w-auto">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase">Table</label>
                    <select
                        className="border rounded p-1.5 text-xs w-full xl:min-w-[150px] bg-white shadow-sm"
                        value={selectedTableId}
                        onChange={(e) => setSelectedTableId(e.target.value)}
                    >
                        <option value="">-- Select Table --</option>
                        {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>

                <div className="flex gap-2 w-full xl:w-auto items-end flex-wrap">
                    {/* View Type */}
                    <div className="flex bg-gray-100 p-0.5 rounded gap-1 flex-1 xl:flex-none justify-center">
                        <button
                            onClick={() => setViewType('table')}
                            className={`px-2 py-1 text-xs rounded flex items-center gap-1 flex-1 justify-center transition-all ${viewType === 'table' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}
                        >
                            <TableIcon size={12} /> <span className="">Table</span>
                        </button>
                        <button
                            onClick={() => setViewType('chart')}
                            className={`px-2 py-1 text-xs rounded flex items-center gap-1 flex-1 justify-center transition-all ${viewType === 'chart' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}
                        >
                            <Activity size={12} /> <span className="">Chart</span>
                        </button>
                    </div>

                    {/* Execute */}
                    <button
                        onClick={handleRunQuery}
                        disabled={!selectedTableId}
                        className={`flex-1 xl:flex-none px-3 py-1 rounded flex items-center justify-center gap-2 text-xs font-semibold transition-all ${!selectedTableId ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm active:transform active:scale-95'}`}
                    >
                        <Play size={12} /> <span className="inline">Run</span>
                    </button>

                    {/* Auto Refresh Toggle */}
                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        disabled={!selectedTableId}
                        className={`flex-1 xl:flex-none px-3 py-1 rounded flex items-center justify-center gap-2 text-xs font-semibold transition-all ${!selectedTableId ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : autoRefresh ? 'bg-green-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        title="Auto Refresh (1s)"
                    >
                        <Activity size={12} /> <span className="inline">Auto (1s)</span>
                    </button>
                </div>
            </div>

            {/* Filters */}
            {selectedTableDef && (
                <div className="bg-gray-50 p-2 rounded border border-gray-100 space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-semibold text-gray-500 flex items-center gap-1 uppercase"><Filter size={10}/> Filters (Temp)</span>
                        <button onClick={addFilter} className="text-[10px] flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"><Plus size={10}/> Add</button>
                    </div>
                    {filters.length === 0 && <div className="text-[10px] text-gray-400 italic py-1">No additional filters</div>}
                    <div className="space-y-1.5 max-h-[100px] overflow-y-auto">
                        {filters.map((f, i) => (
                            <div key={i} className="flex gap-1.5 items-center">
                                <select
                                    value={f.column}
                                    onChange={(e) => updateFilter(i, 'column', e.target.value)}
                                    className="border rounded p-1 text-[10px] bg-white flex-1 min-w-0"
                                >
                                    {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                </select>
                                <select
                                    value={f.operator}
                                    onChange={(e) => updateFilter(i, 'operator', e.target.value)}
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
                                    onChange={(e) => updateFilter(i, 'value', e.target.value)}
                                    className="border rounded p-1 text-[10px] flex-grow bg-white min-w-0"
                                    placeholder="Value..."
                                />
                                <button onClick={() => removeFilter(i)} className="text-red-400 hover:text-red-600 p-1 shrink-0"><Trash2 size={12}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Chart Config */}
            {selectedTableDef && viewType === 'chart' && (
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center bg-blue-50/50 p-2 rounded border border-blue-100">
                    <span className="text-[10px] font-semibold text-blue-800 uppercase shrink-0">Chart:</span>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
                            <label className="text-[10px] text-blue-600 font-medium">X</label>
                            <select value={xAxis} onChange={e => setXAxis(e.target.value)} className="border rounded p-1 text-[10px] bg-white w-full sm:w-auto">
                                {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
                            <label className="text-[10px] text-blue-600 font-medium">Y</label>
                            <select value={yAxis} onChange={e => setYAxis(e.target.value)} className="border rounded p-1 text-[10px] bg-white w-full sm:w-auto">
                                {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Content */}
        <div className="flex-grow overflow-auto p-2 bg-gray-50/50">
            {!hasRun && <div className="h-full flex items-center justify-center text-gray-400 italic text-center p-4 text-xs">Run query to see results</div>}

            {hasRun && viewType === 'table' && (
                <div className="bg-white border rounded shadow-sm overflow-hidden h-full">
                    <div className="overflow-auto h-full">
                        <table className="w-full text-left text-xs relative">
                            <thead className="bg-gray-100 border-b sticky top-0 z-10 shadow-sm">
                                <tr>
                                    {columns.map(c => <th key={c.name} className="p-2 font-semibold text-gray-600 whitespace-nowrap">{c.name}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {results.length === 0 ? (
                                    <tr><td colSpan={columns.length} className="p-4 text-center text-gray-500 italic">No results found</td></tr>
                                ) : (
                                    results.map(r => (
                                        <tr key={r.id} className="hover:bg-gray-50">
                                            {columns.map(c => <td key={c.name} className="p-2 truncate max-w-[150px] whitespace-nowrap">{String(r.data[c.name] ?? '')}</td>)}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {hasRun && viewType === 'chart' && (
                <div className="bg-white border rounded shadow-sm p-2 h-full min-h-[200px]">
                    {results.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-gray-500 italic">No results found</div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey={xAxis} tick={{fontSize: 10}} />
                                <YAxis tick={{fontSize: 10}} />
                                <Tooltip />
                                <Legend wrapperStyle={{fontSize: '10px'}} />
                                <Line type="monotone" dataKey={yAxis} stroke="#2563eb" activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};

const BiDashboard: React.FC = () => {
  const { biDashboard } = useSettings();

  if (!biDashboard.items || biDashboard.items.length === 0) {
      return (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 bg-white rounded border border-dashed p-8 m-4">
              <Activity size={48} className="mb-4 text-gray-300"/>
              <p className="text-lg font-medium">No dashboard widgets configured.</p>
              <p className="text-sm mt-2">Go to <span className="font-bold">Settings &gt; BI Dashboard</span> to add and configure widgets.</p>
          </div>
      )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full overflow-y-auto pb-8">
       {biDashboard.items.map(item => (
           <ErrorBoundary key={item.id}>
               <div className="h-auto min-h-[500px] lg:h-[800px]">
                   <DashboardWidget item={item} />
               </div>
           </ErrorBoundary>
       ))}
    </div>
  );
};

export default BiDashboard;
