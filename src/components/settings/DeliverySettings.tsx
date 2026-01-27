import React from 'react';
import { useSettings, type DeliveryJob } from '../../lib/SettingsContext';
import { validateDeliveryJob } from '../../lib/validation';
import { Trash2, Plus } from 'lucide-react';

const DeliverySettings: React.FC = () => {
  const { delivery, setDelivery, hosts, topics } = useSettings();

  const handleJobChange = (id: string, field: keyof DeliveryJob, value: any) => {
    const newJobs = delivery.jobs.map(job =>
      job.id === id ? { ...job, [field]: value } : job
    );
    setDelivery({ ...delivery, jobs: newJobs });
  };

  const handleHostChange = (id: string, hostField: 'sourceHost' | 'targetHost', pathField: 'sourcePath' | 'targetPath', newHostName: string) => {
    const selectedHost = hosts.find(h => h.name === newHostName);
    const newPath = selectedHost && selectedHost.directories.length > 0 ? selectedHost.directories[0] : '';

    const newJobs = delivery.jobs.map(job =>
      job.id === id ? { ...job, [hostField]: newHostName, [pathField]: newPath } : job
    );
    setDelivery({ ...delivery, jobs: newJobs });
  };

  const handleSourceTypeChange = (id: string, type: 'host' | 'topic') => {
      const newJobs = delivery.jobs.map(job => {
          if (job.id !== id) return job;

          if (type === 'host') {
             const defaultHost = hosts[0];
             return {
                 ...job,
                 sourceType: type,
                 sourceHost: job.sourceHost || defaultHost?.name || '',
                 sourcePath: job.sourcePath || defaultHost?.directories[0] || ''
             };
          } else {
             return {
                 ...job,
                 sourceType: type,
                 sourceTopicId: job.sourceTopicId || (topics.length > 0 ? topics[0].id : '')
             };
          }
      });
      setDelivery({ ...delivery, jobs: newJobs });
  };

  const addJob = () => {
    // Default to available hosts
    const defaultHost = hosts.length > 0 ? hosts[0] : { name: 'localhost', directories: [] };
    const defaultPath = defaultHost.directories.length > 0 ? defaultHost.directories[0] : '/incoming';

    // For target, reuse or pick next
    const defaultTargetHost = hosts.length > 0 ? hosts[0] : { name: 'localhost', directories: [] }; // Usually localhost for internal
    const defaultTargetPath = defaultTargetHost.directories.length > 1 ? defaultTargetHost.directories[1] : (defaultTargetHost.directories[0] || '/internal');


    const newJob: DeliveryJob = {
      id: `del_job_${Date.now()}`,
      name: `Delivery ${delivery.jobs.length + 1}`,
      sourceType: 'host',
      sourceHost: defaultHost.name,
      sourcePath: defaultPath,
      targetHost: defaultTargetHost.name,
      targetPath: defaultTargetPath,
      filterRegex: '.*',
      bandwidth: 100,
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
        {delivery.jobs.map((job) => {
          const errors = validateDeliveryJob(job);
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

                {/* Source Config */}
                <div className="border-b pb-2 mb-2 bg-gray-100 p-2 rounded">
                    <label className="block text-xs font-bold text-gray-700 mb-2">Source Origin</label>
                    <div className="flex gap-4 mb-2">
                        <label className="flex items-center text-xs cursor-pointer">
                            <input
                                type="radio"
                                checked={job.sourceType !== 'topic'}
                                onChange={() => handleSourceTypeChange(job.id, 'host')}
                                className="mr-1"
                            /> Host / Directory
                        </label>
                        <label className="flex items-center text-xs cursor-pointer">
                            <input
                                type="radio"
                                checked={job.sourceType === 'topic'}
                                onChange={() => handleSourceTypeChange(job.id, 'topic')}
                                className="mr-1"
                            /> Topic (CIH)
                        </label>
                    </div>

                    {job.sourceType === 'topic' ? (
                         <div>
                             <label className="block text-xs font-medium text-gray-500">Source Topic</label>
                             <select
                                value={job.sourceTopicId || ''}
                                onChange={(e) => handleJobChange(job.id, 'sourceTopicId', e.target.value)}
                                className={`w-full border rounded p-1 text-sm bg-white ${hasError('sourceTopicId') ? 'border-red-500 bg-red-50' : ''}`}
                                title={getErrorMsg('sourceTopicId')}
                             >
                                <option value="">Select Topic</option>
                                {topics.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                             </select>
                         </div>
                    ) : (
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
                    )}
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
                     <label className="block text-xs font-medium text-gray-500">Latency (ms)</label>
                     <input
                        type="number"
                        value={job.processingTime}
                        onChange={(e) => handleJobChange(job.id, 'processingTime', parseInt(e.target.value) || 0)}
                        className={`w-full border rounded p-1 text-sm ${hasError('processingTime') ? 'border-red-500 bg-red-50' : ''}`}
                        title={getErrorMsg('processingTime')}
                     />
                   </div>
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

export default DeliverySettings;
