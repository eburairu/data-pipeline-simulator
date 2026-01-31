import React from 'react';
import { useSettings, type CollectionJob } from '../../lib/SettingsContext';
import { validateCollectionJob } from '../../lib/validation';
import { Trash2, Plus } from 'lucide-react';

const CollectionSettings: React.FC = () => {
  const { collection, setCollection, topics, connections } = useSettings();

  const handleJobChange = (id: string, field: keyof CollectionJob, value: any) => {
    const newJobs = collection.jobs.map(job =>
      job.id === id ? { ...job, [field]: value } : job
    );
    setCollection({ ...collection, jobs: newJobs });
  };

  const handleTargetTypeChange = (id: string, type: 'host' | 'topic') => {
      const newJobs = collection.jobs.map(job => {
          if (job.id !== id) return job;

          if (type === 'host') {
             const defaultConn = connections.find(c => c.type === 'file');
             return {
                 ...job,
                 targetType: type,
                 targetConnectionId: job.targetConnectionId || defaultConn?.id || '',
                 targetTopicId: undefined // clear topic
             };
          } else {
             return {
                 ...job,
                 targetType: type,
                 targetConnectionId: undefined, // clear conn
                 targetTopicId: job.targetTopicId || (topics.length > 0 ? topics[0].id : '')
             };
          }
      });
      setCollection({ ...collection, jobs: newJobs });
  };

  const addJob = () => {
    const fileConns = connections.filter(c => c.type === 'file');
    const defaultConn = fileConns.length > 0 ? fileConns[0] : undefined;
    const secondConn = fileConns.length > 1 ? fileConns[1] : defaultConn;

    const newJob: CollectionJob = {
      id: `job_${Date.now()}`,
      name: `Job ${collection.jobs.length + 1}`,
      sourceConnectionId: defaultConn?.id || '',
      filterRegex: '.*',
      targetType: 'host',
      targetConnectionId: secondConn?.id || defaultConn?.id || '',
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

  const fileConnections = connections.filter(c => c.type === 'file');

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

                {/* Source Config */}
                <div>
                     <label className="block text-xs font-medium text-gray-500">Source Connection</label>
                     <select
                        value={job.sourceConnectionId}
                        onChange={(e) => handleJobChange(job.id, 'sourceConnectionId', e.target.value)}
                        className={`w-full border rounded p-1 text-sm bg-white ${hasError('sourceConnectionId') ? 'border-red-500 bg-red-50' : ''}`}
                        title={getErrorMsg('sourceConnectionId')}
                     >
                        <option value="">Select Connection</option>
                        {fileConnections.map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.host}:{c.path})</option>
                        ))}
                     </select>
                </div>

                {/* Target Config */}
                <div className="border-t pt-2 mt-2 bg-gray-100 p-2 rounded">
                    <label className="block text-xs font-bold text-gray-700 mb-2">Target Destination</label>
                    <div className="flex gap-4 mb-2">
                        <label className="flex items-center text-xs cursor-pointer">
                            <input
                                type="radio"
                                checked={job.targetType !== 'topic'}
                                onChange={() => handleTargetTypeChange(job.id, 'host')}
                                className="mr-1"
                            /> Connection (File)
                        </label>
                        <label className="flex items-center text-xs cursor-pointer">
                            <input
                                type="radio"
                                checked={job.targetType === 'topic'}
                                onChange={() => handleTargetTypeChange(job.id, 'topic')}
                                className="mr-1"
                            /> Topic (CIH)
                        </label>
                    </div>

                    {job.targetType === 'topic' ? (
                        <div>
                             <label className="block text-xs font-medium text-gray-500">Target Topic</label>
                             <select
                                value={job.targetTopicId || ''}
                                onChange={(e) => handleJobChange(job.id, 'targetTopicId', e.target.value)}
                                className={`w-full border rounded p-1 text-sm bg-white ${hasError('targetTopicId') ? 'border-red-500 bg-red-50' : ''}`}
                                title={getErrorMsg('targetTopicId')}
                             >
                                <option value="">Select Topic</option>
                                {topics.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                             </select>
                         </div>
                    ) : (
                        <div>
                             <label className="block text-xs font-medium text-gray-500">Target Connection</label>
                             <select
                                value={job.targetConnectionId || ''}
                                onChange={(e) => handleJobChange(job.id, 'targetConnectionId', e.target.value)}
                                className={`w-full border rounded p-1 text-sm bg-white ${hasError('targetConnectionId') ? 'border-red-500 bg-red-50' : ''}`}
                                title={getErrorMsg('targetConnectionId')}
                             >
                                <option value="">Select Connection</option>
                                {fileConnections.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} ({c.host}:{c.path})</option>
                                ))}
                             </select>
                         </div>
                    )}
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
