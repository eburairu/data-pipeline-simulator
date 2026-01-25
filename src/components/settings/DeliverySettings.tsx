import React from 'react';
import { useSettings, type DeliveryJob } from '../../lib/SettingsContext';
import { Trash2, Plus } from 'lucide-react';

const DeliverySettings: React.FC = () => {
  const { delivery, setDelivery } = useSettings();

  const handleJobChange = (id: string, field: keyof DeliveryJob, value: any) => {
    const newJobs = delivery.jobs.map(job =>
      job.id === id ? { ...job, [field]: value } : job
    );
    setDelivery({ ...delivery, jobs: newJobs });
  };

  const addJob = () => {
    const newJob: DeliveryJob = {
      id: `del_job_${Date.now()}`,
      name: `Delivery ${delivery.jobs.length + 1}`,
      sourcePath: '/incoming',
      targetPath: '/internal',
      filterRegex: '.*',
      processingTime: 1000,
      executionInterval: 1000,
      enabled: true,
    };
    setDelivery({ ...delivery, jobs: [...delivery.jobs, newJob] });
  };

  const removeJob = (id: string) => {
    setDelivery({ ...delivery, jobs: delivery.jobs.filter(j => j.id !== id) });
  };

  return (
    <div className="space-y-4 p-4 border rounded bg-white shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Delivery Settings</h3>

      <div className="space-y-4">
        {delivery.jobs.map((job) => (
          <div key={job.id} className="border p-4 rounded-md bg-gray-50 relative">
             <div className="absolute top-2 right-2">
                <button onClick={() => removeJob(job.id)} className="text-red-500 hover:text-red-700" title="Delete Job">
                  <Trash2 size={18} />
                </button>
             </div>
             <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                   <div>
                     <label className="block text-xs font-medium text-gray-500">Job Name</label>
                     <input
                        type="text"
                        value={job.name}
                        onChange={(e) => handleJobChange(job.id, 'name', e.target.value)}
                        className="w-full border rounded p-1 text-sm"
                     />
                   </div>
                    <div>
                     <label className="block text-xs font-medium text-gray-500">Interval (ms)</label>
                     <input
                        type="number"
                        value={job.executionInterval}
                        onChange={(e) => handleJobChange(job.id, 'executionInterval', parseInt(e.target.value) || 0)}
                        className="w-full border rounded p-1 text-sm"
                     />
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <div>
                     <label className="block text-xs font-medium text-gray-500">Source Path</label>
                     <input
                        type="text"
                        value={job.sourcePath}
                        onChange={(e) => handleJobChange(job.id, 'sourcePath', e.target.value)}
                        className="w-full border rounded p-1 text-sm"
                     />
                   </div>
                    <div>
                     <label className="block text-xs font-medium text-gray-500">Target Path</label>
                     <input
                        type="text"
                        value={job.targetPath}
                        onChange={(e) => handleJobChange(job.id, 'targetPath', e.target.value)}
                        className="w-full border rounded p-1 text-sm"
                     />
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <div>
                     <label className="block text-xs font-medium text-gray-500">Processing Time (ms)</label>
                     <input
                        type="number"
                        value={job.processingTime}
                        onChange={(e) => handleJobChange(job.id, 'processingTime', parseInt(e.target.value) || 0)}
                        className="w-full border rounded p-1 text-sm"
                     />
                   </div>
                   <div>
                     <label className="block text-xs font-medium text-gray-500">Filter Regex</label>
                     <input
                        type="text"
                        value={job.filterRegex}
                        onChange={(e) => handleJobChange(job.id, 'filterRegex', e.target.value)}
                        className="w-full border rounded p-1 text-sm"
                        placeholder=".*"
                     />
                   </div>
                </div>
             </div>
          </div>
        ))}
      </div>

      <button
        onClick={addJob}
        className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-500 hover:text-blue-500 transition-colors"
      >
        <Plus size={20} /> Add Job
      </button>
    </div>
  );
};

export default DeliverySettings;
