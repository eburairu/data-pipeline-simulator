/**
 * データクエリウィジェット（旧DashboardWidget）
 * テーブルデータのクエリ・フィルタ・可視化を提供する
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useVirtualDB, type DBFilter, type DBRecord } from '../../lib/VirtualDB';
import { useSettings, type DashboardItem } from '../../lib/SettingsContext';
import { Play, Table as TableIcon, Activity } from 'lucide-react';
import { TIMEOUTS } from '../../lib/constants';
import QueryFilterPanel from './QueryFilterPanel';
import QueryTableView from './QueryTableView';
import QueryChartView from './QueryChartView';

interface QueryWidgetProps {
  item: DashboardItem;
}

const QueryWidget: React.FC<QueryWidgetProps> = ({ item }) => {
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

  const handleRunQueryRef = useRef(handleRunQuery);
  useEffect(() => {
    handleRunQueryRef.current = handleRunQuery;
  });

  // マウント時の自動実行
  useEffect(() => {
    if (selectedTableId) {
      handleRunQuery();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 設定による自動リフレッシュ
  useEffect(() => {
    if (item.refreshInterval > 0 && selectedTableId && !autoRefresh) {
      const interval = setInterval(() => handleRunQueryRef.current(), item.refreshInterval);
      return () => clearInterval(interval);
    }
  }, [item.refreshInterval, selectedTableId, autoRefresh]);

  // 手動トグルによる自動リフレッシュ（1秒間隔）
  useEffect(() => {
    if (autoRefresh && selectedTableId) {
      const interval = setInterval(() => handleRunQueryRef.current(), TIMEOUTS.DASHBOARD_AUTO_REFRESH);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, selectedTableId]);

  // X/Y軸デフォルト設定
  useEffect(() => {
    if (columns.length > 0) {
      if (!xAxis) setXAxis(columns[0].name);
      if (!yAxis) {
        const numericCol = columns.find(c => c.type === 'number' || c.type === 'integer' || c.type === 'decimal');
        setYAxis(numericCol ? numericCol.name : columns[0].name);
      }
    }
  }, [selectedTableId, columns, xAxis, yAxis]);

  // テーブル変更時のリセット
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
      {/* ヘッダー */}
      <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
        <h2 className="text-base font-bold flex items-center gap-2 text-gray-800 truncate" title={item.title}>
          <Activity className="w-4 h-4 text-blue-600" /> {item.title || selectedTableDef?.name || 'Dashboard Widget'}
        </h2>
      </div>

      {/* コントロール */}
      <div className="p-2 border-b space-y-2">
        <div className="flex flex-col xl:flex-row gap-2 xl:items-end">
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
            <div className="flex bg-gray-100 p-0.5 rounded gap-1 flex-1 xl:flex-none justify-center">
              <button
                onClick={() => setViewType('table')}
                className={`px-2 py-1 text-xs rounded flex items-center gap-1 flex-1 justify-center transition-all ${viewType === 'table' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}
              >
                <TableIcon size={12} /> <span>Table</span>
              </button>
              <button
                onClick={() => setViewType('chart')}
                className={`px-2 py-1 text-xs rounded flex items-center gap-1 flex-1 justify-center transition-all ${viewType === 'chart' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}
              >
                <Activity size={12} /> <span>Chart</span>
              </button>
            </div>

            <button
              onClick={handleRunQuery}
              disabled={!selectedTableId}
              className={`flex-1 xl:flex-none px-3 py-1 rounded flex items-center justify-center gap-2 text-xs font-semibold transition-all ${!selectedTableId ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm active:transform active:scale-95'}`}
            >
              <Play size={12} /> <span className="inline">Run</span>
            </button>

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

        {/* フィルタパネル */}
        {selectedTableDef && (
          <QueryFilterPanel
            filters={filters}
            columns={columns}
            onAddFilter={addFilter}
            onRemoveFilter={removeFilter}
            onUpdateFilter={updateFilter}
          />
        )}

        {/* チャート設定 */}
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

      {/* コンテンツ */}
      <div className="flex-grow overflow-auto p-2 bg-gray-50/50">
        {!hasRun && <div className="h-full flex items-center justify-center text-gray-400 italic text-center p-4 text-xs">Run query to see results</div>}

        {hasRun && viewType === 'table' && (
          <QueryTableView results={results} columns={columns} />
        )}

        {hasRun && viewType === 'chart' && (
          <div className="bg-white border rounded shadow-sm p-2 h-full min-h-[200px]">
            <QueryChartView data={chartData} xAxis={xAxis} yAxis={yAxis} />
          </div>
        )}
      </div>
    </div>
  );
};

export default QueryWidget;
