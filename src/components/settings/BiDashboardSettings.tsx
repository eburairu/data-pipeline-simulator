import React, { useEffect, useState } from 'react';
import { useSettings } from '../../lib/SettingsContext';
import { Activity, Layout, Clock } from 'lucide-react';

const BiDashboardSettings: React.FC = () => {
  const { biDashboard, setBiDashboard, tables } = useSettings();
  const [localSettings, setLocalSettings] = useState(biDashboard);

  // Sync local state with global state when it changes (e.g. initial load)
  useEffect(() => {
    setLocalSettings(biDashboard);
  }, [biDashboard]);

  const handleChange = (field: keyof typeof biDashboard, value: any) => {
    const newSettings = { ...localSettings, [field]: value };
    setLocalSettings(newSettings);
    setBiDashboard(newSettings);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <Activity size={20} className="text-blue-600" />
          BI Dashboard Settings
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Configure default behavior for the BI Dashboard.
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Default Table */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start border-b pb-6">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700">Default Table</label>
            <p className="text-xs text-gray-500 mt-1">The table to select automatically when the dashboard opens.</p>
          </div>
          <div className="md:col-span-2">
            <select
              value={localSettings.defaultTableId}
              onChange={(e) => handleChange('defaultTableId', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
            >
              <option value="">-- Select a Table --</option>
              {tables.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Default View Type */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start border-b pb-6">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700">Default View</label>
            <p className="text-xs text-gray-500 mt-1">The initial visualization mode.</p>
          </div>
          <div className="md:col-span-2">
             <div className="flex gap-4">
                <label className="flex items-center gap-2">
                    <input
                        type="radio"
                        name="viewType"
                        value="table"
                        checked={localSettings.defaultViewType === 'table'}
                        onChange={() => handleChange('defaultViewType', 'table')}
                        className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 flex items-center gap-1"><Layout size={14}/> Table</span>
                </label>
                <label className="flex items-center gap-2">
                    <input
                        type="radio"
                        name="viewType"
                        value="chart"
                        checked={localSettings.defaultViewType === 'chart'}
                        onChange={() => handleChange('defaultViewType', 'chart')}
                        className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 flex items-center gap-1"><Activity size={14}/> Chart</span>
                </label>
             </div>
          </div>
        </div>

        {/* Refresh Interval (Placeholder for now, implementation in dashboard would require auto-refresh logic) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700">Auto-Refresh Interval</label>
            <p className="text-xs text-gray-500 mt-1">Automatically run the query at this interval (0 to disable).</p>
          </div>
          <div className="md:col-span-2">
             <div className="flex items-center gap-2">
                <Clock size={16} className="text-gray-400"/>
                <input
                    type="number"
                    min="0"
                    step="1000"
                    value={localSettings.refreshInterval}
                    onChange={(e) => handleChange('refreshInterval', parseInt(e.target.value) || 0)}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                />
                <span className="text-sm text-gray-500">ms</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BiDashboardSettings;
