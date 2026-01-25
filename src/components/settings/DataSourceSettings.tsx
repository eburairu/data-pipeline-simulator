import React from 'react';
import { useSettings } from '../../lib/SettingsContext';

const DataSourceSettings: React.FC = () => {
  const { dataSource, setDataSource } = useSettings();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDataSource({
      ...dataSource,
      [name]: name === 'executionInterval' ? parseInt(value) || 0 : value,
    });
  };

  return (
    <div className="space-y-4 p-4 border rounded bg-white shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Data Source Settings</h3>
      <div className="grid gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Source Path</label>
          <input
            type="text"
            name="sourcePath"
            value={dataSource.sourcePath}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
          />
          <p className="text-xs text-gray-500 mt-1">Directory where files are created</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Generation Interval (ms)</label>
          <input
            type="number"
            name="executionInterval"
            value={dataSource.executionInterval}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
          />
          <p className="text-xs text-gray-500 mt-1">Time between file generations in auto-run mode</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">File Prefix</label>
          <input
            type="text"
            name="filePrefix"
            value={dataSource.filePrefix}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
          />
          <p className="text-xs text-gray-500 mt-1">Prefix for generated files (e.g. "data_")</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">File Content</label>
          <input
            type="text"
            name="fileContent"
            value={dataSource.fileContent}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
          />
          <p className="text-xs text-gray-500 mt-1">Default content for generated files</p>
        </div>
      </div>
    </div>
  );
};

export default DataSourceSettings;
