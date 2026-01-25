import React from 'react';
import { useSettings } from '../../lib/SettingsContext';

const EtlSettings: React.FC = () => {
  const { etl, setEtl, hosts } = useSettings();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEtl({
      ...etl,
      [name]: (name === 'processingTime' || name === 'executionInterval') ? parseInt(value) || 0 : value,
    });
  };

  const handleHostChange = (newHostName: string) => {
     const selectedHost = hosts.find(h => h.name === newHostName);
     const newPath = selectedHost && selectedHost.directories.length > 0 ? selectedHost.directories[0] : '';
     setEtl({
        ...etl,
        sourceHost: newHostName,
        sourcePath: newPath
     });
  };

  return (
    <div className="space-y-4 p-4 border rounded bg-white shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">ETL Settings</h3>
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-medium text-gray-700">Source Host</label>
              <select
                name="sourceHost"
                value={etl.sourceHost}
                onChange={(e) => handleHostChange(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white"
              >
                {hosts.map(h => (
                    <option key={h.name} value={h.name}>{h.name}</option>
                ))}
              </select>
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-700">Source Path</label>
              <select
                name="sourcePath"
                value={etl.sourcePath}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white"
              >
                 {hosts.find(h => h.name === etl.sourceHost)?.directories.map(dir => (
                    <option key={dir} value={dir}>{dir}</option>
                )) || <option value="">Select Host First</option>}
              </select>
              <p className="text-xs text-gray-500 mt-1">Directory to watch for ETL processing</p>
            </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Execution Interval (ms)</label>
          <input
            type="number"
            name="executionInterval"
            value={etl.executionInterval}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Raw Table Name</label>
          <input
            type="text"
            name="rawTableName"
            value={etl.rawTableName}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Summary Table Name</label>
          <input
            type="text"
            name="summaryTableName"
            value={etl.summaryTableName}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Processing Time (ms)</label>
          <input
            type="number"
            name="processingTime"
            value={etl.processingTime}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
          />
        </div>
      </div>
    </div>
  );
};

export default EtlSettings;
