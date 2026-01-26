import React from 'react';
import { useSettings, type CollectionJob } from '../../lib/SettingsContext';
import { validateCollectionJob } from '../../lib/validation';
import { Trash2, Plus } from 'lucide-react';

const CollectionSettings: React.FC = () => {
  const { collection, setCollection, hosts } = useSettings();

  const handleJobChange = (id: string, field: keyof CollectionJob, value: any) => {
    const newJobs = collection.jobs.map(job =>
      job.id === id ? { ...job, [field]: value } : job
    );
    setCollection({ ...collection, jobs: newJobs });
  };

  const handleHostChange = (id: string, hostField: 'sourceHost' | 'targetHost', pathField: 'sourcePath' | 'targetPath', newHostName: string) => {
    const selectedHost = hosts.find(h => h.name === newHostName);
    const newPath = selectedHost && selectedHost.directories.length > 0 ? selectedHost.directories[0] : '';

    const newJobs = collection.jobs.map(job =>
      job.id === id ? { ...job, [hostField]: newHostName, [pathField]: newPath } : job
    );
    setCollection({ ...collection, jobs: newJobs });
  };

  const addJob = () => {
    // Default to the first available host and directory
    const defaultHost = hosts.length > 0 ? hosts[0] : { name: 'localhost', directories: [] };
    const defaultPath = defaultHost.directories.length > 0 ? defaultHost.directories[0] : '/source';

    // For target, try to pick a different one if possible, or same
    const defaultTargetHost = hosts.length > 1 ? hosts[1] : defaultHost;
    const defaultTargetPath = defaultTargetHost.directories.length > 0 ? defaultTargetHost.directories[0] : '/incoming';


    const newJob: CollectionJob = {
      id: `job_${Date.now()}`,
      name: `Job ${collection.jobs.length + 1}`,
      sourceHost: defaultHost.name,
      sourcePath: defaultPath,
      filterRegex: '.*',
      targetHost: defaultTargetHost.name,
      targetPath: defaultTargetPath,
      bandwidth: 100,
      renamePattern: '${fileName}',
      executionInterval: 1000,
      enabled: true,
    };
    setCollection({ ...collection, jobs: [...collection.jobs, newJob] });
  };

  const removeJob = (id: string) => {
    setCollection({ ...collection, jobs: collection.jobs.filter(j => j.id !== id) });
  };

  const handleProcessingTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     setCollection({ ...collection, processingTime: parseInt(e.target.value) || 0 });
  }

  return (
    <div className="space-y-4 p-4 border rounded bg-white shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Collection Settings</h3>

      {/* Global Settings */}
       <div>
          <label className="block text-sm font-medium text-gray-700">Base Processing Time (Latency) (ms)</label>
          <input
            type="number"
            value={collection.processingTime}
            onChange={handleProcessingTimeChange}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 ${collection.processingTime < 0 ? 'border-red-500 bg-red-50' : ''}`}
            title={collection.processingTime < 0 ? "Cannot be negative" : ""}
          />
        </div>

      <div className="space-y-4">
        {collection.jobs.map((job) => {
          const errors = validateCollectionJob(job);
          const hasError = (field: string) => errors.some(e => e.field === field);
          const getErrorMsg = (field: string) => errors.find(e => e.field === field)?.message;

          return (
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
                        className={`w-full border rounded p-1 text-sm ${hasError('name') ? 'border-red-500 bg-red-50' : ''}`}
                        title={getErrorMsg('name')}
                     />
                   </div>
                    <div>
                     <label className="block text-xs font-medium text-gray-500">Interval (ms)</label>
                     <input
                        type="number"
                        value={job.executionInterval}
                        onChange={(e) => handleJobChange(job.id, 'executionInterval', parseInt(e.target.value) || 0)}
                        className={`w-full border rounded p-1 text-sm ${hasError('executionInterval') ? 'border-red-500 bg-red-50' : ''}`}
                        title={getErrorMsg('executionInterval')}
                     />
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <div>
                     <label className="block text-xs font-medium text-gray-500">Source Host</label>
                     <select
                        value={job.sourceHost}
                        onChange={(e) => handleHostChange(job.id, 'sourceHost', 'sourcePath', e.target.value)}
                        className={`w-full border rounded p-1 text-sm bg-white ${hasError('sourceHost') ? 'border-red-500 bg-red-50' : ''}`}
                        title={getErrorMsg('sourceHost')}
                     >
                        {hosts.map(h => (
                            <option key={h.name} value={h.name}>{h.name}</option>
                        ))}
                     </select>
                   </div>
                   <div>
                     <label className="block text-xs font-medium text-gray-500">Source Path</label>
                     <select
                        value={job.sourcePath}
                        onChange={(e) => handleJobChange(job.id, 'sourcePath', e.target.value)}
                        className={`w-full border rounded p-1 text-sm bg-white ${hasError('sourcePath') ? 'border-red-500 bg-red-50' : ''}`}
                        title={getErrorMsg('sourcePath')}
                     >
                        {hosts.find(h => h.name === job.sourceHost)?.directories.map(dir => (
                            <option key={dir} value={dir}>{dir}</option>
                        )) || <option value="">Select Host First</option>}
                     </select>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                     <label className="block text-xs font-medium text-gray-500">Target Host</label>
                     <select
                        value={job.targetHost}
                        onChange={(e) => handleHostChange(job.id, 'targetHost', 'targetPath', e.target.value)}
                        className={`w-full border rounded p-1 text-sm bg-white ${hasError('targetHost') ? 'border-red-500 bg-red-50' : ''}`}
                        title={getErrorMsg('targetHost')}
                     >
                        {hosts.map(h => (
                            <option key={h.name} value={h.name}>{h.name}</option>
                        ))}
                     </select>
                   </div>
                    <div>
                     <label className="block text-xs font-medium text-gray-500">Target Path</label>
                     <select
                        value={job.targetPath}
                        onChange={(e) => handleJobChange(job.id, 'targetPath', e.target.value)}
                        className={`w-full border rounded p-1 text-sm bg-white ${hasError('targetPath') ? 'border-red-500 bg-red-50' : ''}`}
                        title={getErrorMsg('targetPath')}
                     >
                        {hosts.find(h => h.name === job.targetHost)?.directories.map(dir => (
                            <option key={dir} value={dir}>{dir}</option>
                        )) || <option value="">Select Host First</option>}
                     </select>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <div>
                     <label className="block text-xs font-medium text-gray-500">Bandwidth (chars/sec)</label>
                     <input
                        type="number"
                        value={job.bandwidth}
                        onChange={(e) => handleJobChange(job.id, 'bandwidth', parseInt(e.target.value) || 0)}
                        className={`w-full border rounded p-1 text-sm ${hasError('bandwidth') ? 'border-red-500 bg-red-50' : ''}`}
                        title={getErrorMsg('bandwidth')}
                     />
                   </div>
                    <div>
                     <label className="block text-xs font-medium text-gray-500">Filter Regex</label>
                     <input
                        type="text"
                        value={job.filterRegex}
                        onChange={(e) => handleJobChange(job.id, 'filterRegex', e.target.value)}
                        className={`w-full border rounded p-1 text-sm ${hasError('filterRegex') ? 'border-red-500 bg-red-50' : ''}`}
                        title={getErrorMsg('filterRegex')}
                        placeholder=".*"
                     />
                   </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">Rename Pattern (Vars: {'${fileName}'}, {'${collectionHost}'}, {'${timestamp}'})</label>
                  <input
                    type="text"
                    value={job.renamePattern || '${fileName}'}
                    onChange={(e) => handleJobChange(job.id, 'renamePattern', e.target.value)}
                    className="w-full border rounded p-1 text-sm"
                  />
                </div>
             </div>
          </div>
          );
        })}
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

export default CollectionSettings;
