import React from 'react';
import { useSettings } from '../../lib/SettingsContext';

const EtlSettings: React.FC = () => {
  const { etl, setEtl } = useSettings();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEtl({
      ...etl,
      [name]: name === 'processingTime' ? parseInt(value) || 0 : value,
    });
  };

  return (
    <div className="space-y-4 p-4 border rounded bg-white shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">ETL Settings</h3>
      <div className="grid gap-4">
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
