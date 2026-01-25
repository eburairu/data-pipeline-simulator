import React from 'react';
import { useSettings, type DataSourceJob } from '../../lib/SettingsContext';
import { Trash2, Plus } from 'lucide-react';

const DataSourceSettings: React.FC = () => {
  const { dataSource, setDataSource } = useSettings();

  const handleJobChange = (id: string, field: keyof DataSourceJob, value: any) => {
    const newJobs = dataSource.jobs.map(job =>
      job.id === id ? { ...job, [field]: value } : job
    );
    setDataSource({ ...dataSource, jobs: newJobs });
  };

  const addJob = () => {
    const newJob: DataSourceJob = {
      id: `ds_job_${Date.now()}`,
      name: `Source ${dataSource.jobs.length + 1}`,
      host: 'localhost',
      sourcePath: '/source',
      filePrefix: 'data_',
      fileContent: 'sample,data,123',
      executionInterval: 1000,
      enabled: true,
    };
    setDataSource({ ...dataSource, jobs: [...dataSource.jobs, newJob] });
  };

  const removeJob = (id: string) => {
    setDataSource({ ...dataSource, jobs: dataSource.jobs.filter(j => j.id !== id) });
  };

  return (
    <div className="space-y-4 p-4 border rounded bg-white shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Data Source Settings</h3>

      <div className="space-y-4">
        {dataSource.jobs.map((job) => (
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
                        <label className="block text-xs font-medium text-gray-500">Host</label>
                        <input
                            type="text"
                            value={job.host}
                            onChange={(e) => handleJobChange(job.id, 'host', e.target.value)}
                            className="w-full border rounded p-1 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500">Source Path</label>
                        <input
                            type="text"
                            value={job.sourcePath}
                            onChange={(e) => handleJobChange(job.id, 'sourcePath', e.target.value)}
                            className="w-full border rounded p-1 text-sm"
                        />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                   <div>
                     <label className="block text-xs font-medium text-gray-500">File Prefix</label>
                     <input
                        type="text"
                        value={job.filePrefix}
                        onChange={(e) => handleJobChange(job.id, 'filePrefix', e.target.value)}
                        className="w-full border rounded p-1 text-sm"
                     />
                   </div>
                    <div>
                     <label className="block text-xs font-medium text-gray-500">File Content</label>
                     <input
                        type="text"
                        value={job.fileContent}
                        onChange={(e) => handleJobChange(job.id, 'fileContent', e.target.value)}
                        className="w-full border rounded p-1 text-sm"
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

export default DataSourceSettings;
