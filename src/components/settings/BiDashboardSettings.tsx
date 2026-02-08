import React, { useEffect, useState } from 'react';
import { useSettings, type DashboardItem, type TableDefinition } from '../../lib/SettingsContext';
import { type DBFilter } from '../../lib/VirtualDB';
import { Activity, Layout, Clock, Plus, Trash2, Filter, ChevronDown, ChevronUp } from 'lucide-react';

const BiDashboardSettings: React.FC = () => {
  const { biDashboard, setBiDashboard, tables } = useSettings();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const handleChange = (updates: Partial<typeof biDashboard>) => {
    setBiDashboard({ ...biDashboard, ...updates });
  };

  const updateItem = (id: string, updates: Partial<DashboardItem>) => {
    const newItems = biDashboard.items.map(item =>
      item.id === id ? { ...item, ...updates } : item
    );
    handleChange({ items: newItems });
  };

  const addItem = () => {
    const newItem: DashboardItem = {
      id: `widget_${Date.now()}`,
      type: 'query',
      title: 'New Widget',
      tableId: tables[0]?.id || '',
      viewType: 'table',
      filters: [],
      refreshInterval: 0,
      chartConfig: { xAxis: '', yAxis: '' }
    };
    handleChange({ items: [...biDashboard.items, newItem] });
    setExpandedItems(prev => new Set(prev).add(newItem.id));
  };

  const removeItem = (id: string) => {
    handleChange({ items: biDashboard.items.filter(i => i.id !== id) });
  };

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <Activity size={20} className="text-blue-600" />
          BI Dashboard Settings
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Configure dashboard widgets and visibility.
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Show Dashboard */}
        <div className="flex items-center gap-3 border-b pb-6">
            <input
                type="checkbox"
                id="showDashboard"
                checked={biDashboard.showDashboard}
                onChange={(e) => handleChange({ showDashboard: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
            />
            <div>
                <label htmlFor="showDashboard" className="text-sm font-medium text-gray-700">Show BI Dashboard</label>
                <p className="text-xs text-gray-500">Enable or disable the dashboard tab.</p>
            </div>
        </div>

        {/* Widgets List */}
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-gray-700">Widgets</h4>
                <button
                    onClick={addItem}
                    className="flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition-colors"
                >
                    <Plus size={14} /> Add Widget
                </button>
            </div>

            {biDashboard.items.length === 0 && (
                <div className="text-center p-8 border-2 border-dashed rounded-lg bg-gray-50 text-gray-500 text-sm">
                    No widgets configured. Click "Add Widget" to create one.
                </div>
            )}

            {biDashboard.items.map((item, index) => (
                <WidgetEditor
                    key={item.id}
                    item={item}
                    updateItem={updateItem}
                    removeItem={removeItem}
                    tables={tables}
                    isExpanded={expandedItems.has(item.id)}
                    toggleExpand={() => toggleExpand(item.id)}
                    index={index}
                />
            ))}
        </div>
      </div>
    </div>
  );
};

interface WidgetEditorProps {
    item: DashboardItem;
    updateItem: (id: string, updates: Partial<DashboardItem>) => void;
    removeItem: (id: string) => void;
    tables: TableDefinition[];
    isExpanded: boolean;
    toggleExpand: () => void;
    index: number;
}

const WidgetEditor: React.FC<WidgetEditorProps> = ({ item, updateItem, removeItem, tables, isExpanded, toggleExpand, index }) => {
    const selectedTableDef = tables.find(t => t.id === item.tableId);
    const columns = selectedTableDef ? selectedTableDef.columns : [];

    // Initialize chart config if missing
    useEffect(() => {
        if (!item.chartConfig) {
            updateItem(item.id, { chartConfig: { xAxis: '', yAxis: '' } });
        }
    }, [item.id, item.chartConfig, updateItem]);

    const addFilter = () => {
        if (columns.length > 0) {
            const newFilter: DBFilter = { column: columns[0].name, operator: '=', value: '' };
            updateItem(item.id, { filters: [...(item.filters || []), newFilter] });
        }
    };

    const updateFilter = (idx: number, field: keyof DBFilter, value: string) => {
        const newFilters = [...item.filters];
        newFilters[idx] = { ...newFilters[idx], [field]: value };
        updateItem(item.id, { filters: newFilters });
    };

    const removeFilter = (idx: number) => {
        updateItem(item.id, { filters: item.filters.filter((_, i) => i !== idx) });
    };

    return (
        <div className={`border rounded-lg bg-white transition-all ${isExpanded ? 'shadow-md border-blue-200 ring-1 ring-blue-100' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 rounded-t-lg" onClick={toggleExpand}>
                <div className="flex items-center gap-3 flex-1">
                    <span className="bg-gray-100 text-gray-500 w-6 h-6 flex items-center justify-center rounded text-xs font-mono">{index + 1}</span>
                    <span className="font-semibold text-sm text-gray-800">{item.title || 'Untitled Widget'}</span>
                    <span className="text-xs text-gray-400">({item.viewType} - {selectedTableDef?.name || 'No Table'})</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                        className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
                        title="Remove Widget"
                    >
                        <Trash2 size={16} />
                    </button>
                    {isExpanded ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
                </div>
            </div>

            {isExpanded && (
                <div className="p-4 border-t bg-gray-50/50 space-y-4">
                    {/* Basic Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                            <input
                                type="text"
                                value={item.title || ''}
                                onChange={(e) => updateItem(item.id, { title: e.target.value })}
                                className="w-full border rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Widget Title"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Data Source Table</label>
                            <select
                                value={item.tableId}
                                onChange={(e) => updateItem(item.id, { tableId: e.target.value })}
                                className="w-full border rounded p-2 text-sm bg-white"
                            >
                                <option value="">-- Select Table --</option>
                                {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">View Type</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name={`viewType-${item.id}`}
                                        value="table"
                                        checked={item.viewType === 'table'}
                                        onChange={() => updateItem(item.id, { viewType: 'table' })}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm flex items-center gap-1"><Layout size={14}/> Table</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name={`viewType-${item.id}`}
                                        value="chart"
                                        checked={item.viewType === 'chart'}
                                        onChange={() => updateItem(item.id, { viewType: 'chart' })}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm flex items-center gap-1"><Activity size={14}/> Chart</span>
                                </label>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Auto-Refresh (ms)</label>
                            <div className="flex items-center gap-2">
                                <Clock size={14} className="text-gray-400"/>
                                <input
                                    type="number"
                                    min="0"
                                    step="1000"
                                    value={item.refreshInterval}
                                    onChange={(e) => updateItem(item.id, { refreshInterval: parseInt(e.target.value) || 0 })}
                                    className="w-full border rounded p-2 text-sm"
                                    placeholder="0 (Disabled)"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Chart Config */}
                    {item.viewType === 'chart' && selectedTableDef && (
                        <div className="bg-blue-50 p-3 rounded border border-blue-100">
                             <h5 className="text-xs font-bold text-blue-800 uppercase mb-2">Chart Configuration</h5>
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-blue-700 mb-1">X Axis (Category)</label>
                                    <select
                                        value={item.chartConfig?.xAxis || ''}
                                        onChange={(e) => updateItem(item.id, { chartConfig: { ...item.chartConfig, xAxis: e.target.value } as any })}
                                        className="w-full border rounded p-1.5 text-sm bg-white"
                                    >
                                        <option value="">-- Select --</option>
                                        {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-blue-700 mb-1">Y Axis (Value)</label>
                                    <select
                                        value={item.chartConfig?.yAxis || ''}
                                        onChange={(e) => updateItem(item.id, { chartConfig: { ...item.chartConfig, yAxis: e.target.value } as any })}
                                        className="w-full border rounded p-1.5 text-sm bg-white"
                                    >
                                        <option value="">-- Select --</option>
                                        {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>
                             </div>
                        </div>
                    )}

                    {/* Default Filters */}
                    {selectedTableDef && (
                        <div className="bg-gray-100 p-3 rounded border border-gray-200">
                             <div className="flex justify-between items-center mb-2">
                                <h5 className="text-xs font-bold text-gray-600 uppercase flex items-center gap-1"><Filter size={12}/> Default Filters</h5>
                                <button onClick={addFilter} className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"><Plus size={12}/> Add Filter</button>
                             </div>

                             {(!item.filters || item.filters.length === 0) && (
                                 <p className="text-xs text-gray-400 italic">No default filters applied.</p>
                             )}

                             <div className="space-y-2">
                                {item.filters?.map((f, i) => (
                                    <div key={i} className="flex gap-2 items-center">
                                        <select
                                            value={f.column}
                                            onChange={(e) => updateFilter(i, 'column', e.target.value)}
                                            className="border rounded p-1.5 text-xs bg-white flex-1 min-w-0"
                                        >
                                            {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                        </select>
                                        <select
                                            value={f.operator}
                                            onChange={(e) => updateFilter(i, 'operator', e.target.value as any)}
                                            className="border rounded p-1.5 text-xs bg-white w-[60px]"
                                        >
                                            <option value="=">=</option>
                                            <option value="!=">!=</option>
                                            <option value=">">&gt;</option>
                                            <option value="<">&lt;</option>
                                            <option value=">=">&gt;=</option>
                                            <option value="<=">&lt;=</option>
                                            <option value="contains">cont.</option>
                                        </select>
                                        <input
                                            type="text"
                                            value={f.value}
                                            onChange={(e) => updateFilter(i, 'value', e.target.value)}
                                            className="border rounded p-1.5 text-xs flex-grow bg-white min-w-0"
                                            placeholder="Value..."
                                        />
                                        <button onClick={() => removeFilter(i)} className="text-red-400 hover:text-red-600 p-1 shrink-0"><Trash2 size={14}/></button>
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BiDashboardSettings;
