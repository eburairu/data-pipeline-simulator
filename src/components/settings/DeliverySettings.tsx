import React from 'react';
import { useSettings, type DeliveryJob } from '../../lib/SettingsContext';
import { validateDeliveryJob } from '../../lib/validation';
import { Trash2, Plus } from 'lucide-react';

const DeliverySettings: React.FC = () => {
   const { delivery, setDelivery, topics, connections } = useSettings();

   const handleJobChange = (id: string, field: keyof DeliveryJob, value: any) => {
      const newJobs = delivery.jobs.map(job =>
         job.id === id ? { ...job, [field]: value } : job
      );
      setDelivery({ ...delivery, jobs: newJobs });
   };

   const handleSourceTypeChange = (id: string, type: 'host' | 'topic') => {
      const newJobs = delivery.jobs.map(job => {
         if (job.id !== id) return job;

         if (type === 'host') {
            const defaultConn = connections.find(c => c.type === 'file');
            return {
               ...job,
               sourceType: type,
               sourceConnectionId: job.sourceConnectionId || defaultConn?.id || '',
               sourceTopicId: undefined
            };
         } else {
            return {
               ...job,
               sourceType: type,
               sourceConnectionId: undefined,
               sourceTopicId: job.sourceTopicId || (topics.length > 0 ? topics[0].id : '')
            };
         }
      });
      setDelivery({ ...delivery, jobs: newJobs });
   };

   const addJob = () => {
      const fileConns = connections.filter(c => c.type === 'file');
      const defaultConn = fileConns.length > 0 ? fileConns[0] : undefined;
      const secondConn = fileConns.length > 1 ? fileConns[1] : defaultConn;

      const newJob: DeliveryJob = {
         id: `del_job_${Date.now()}`,
         name: `Delivery ${delivery.jobs.length + 1}`,
         sourceType: 'host',
         sourceConnectionId: defaultConn?.id || '',
         targetConnectionId: secondConn?.id || defaultConn?.id || '',
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

   const fileConnections = connections.filter(c => c.type === 'file');

   return (
      <div className="space-y-4 p-4 border rounded bg-white shadow-sm">
         <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Subscriptions (Delivery)</h3>

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
                                 /> Connection (File)
                              </label>
                              <label className="flex items-center text-xs cursor-pointer">
                                 <input
                                    type="radio"
                                    checked={job.sourceType === 'topic'}
                                    onChange={() => handleSourceTypeChange(job.id, 'topic')}
                                    className="mr-1"
                                 /> Topic
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
                              <div>
                                 <label className="block text-xs font-medium text-gray-500">Source Connection</label>
                                 <select
                                    value={job.sourceConnectionId || ''}
                                    onChange={(e) => handleJobChange(job.id, 'sourceConnectionId', e.target.value)}
                                    className={`w-full border rounded p-1 text-sm bg-white ${hasError('sourceConnectionId') ? 'border-red-500 bg-red-50' : ''}`}
                                    title={getErrorMsg('sourceConnectionId')}
                                 >
                                    <option value="">Select Connection</option>
                                    {fileConnections.map(c => (
                                       <option key={c.id} value={c.id}>{c.name} ({c.host}:{c.path})</option>
                                    ))}
                                 </select>
                                 <div className="mt-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                       <input
                                          type="checkbox"
                                          checked={job.deleteSourceAfterTransfer !== false}
                                          onChange={(e) => handleJobChange(job.id, 'deleteSourceAfterTransfer', e.target.checked)}
                                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                       />
                                       <span className="text-xs text-gray-700">
                                          Delete source file after transfer
                                          <span className="text-gray-400 ml-1">(uncheck to copy)</span>
                                       </span>
                                    </label>
                                 </div>
                              </div>
                           )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
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
