import React from 'react';
import { useSettings } from '../../lib/SettingsContext';

const DeliverySettings: React.FC = () => {
  const { delivery, setDelivery } = useSettings();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDelivery({
      ...delivery,
      [name]: (name === 'processingTime' || name === 'executionInterval') ? parseInt(value) || 0 : value,
    });
  };

  return (
    <div className="space-y-4 p-4 border rounded bg-white shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Delivery Settings</h3>
      <div className="grid gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Execution Interval (ms)</label>
          <input
            type="number"
            name="executionInterval"
            value={delivery.executionInterval}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Source Path</label>
          <input
            type="text"
            name="sourcePath"
            value={delivery.sourcePath}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Target Path</label>
          <input
            type="text"
            name="targetPath"
            value={delivery.targetPath}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Processing Time (ms)</label>
          <input
            type="number"
            name="processingTime"
            value={delivery.processingTime}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
          />
        </div>
      </div>
    </div>
  );
};

export default DeliverySettings;
