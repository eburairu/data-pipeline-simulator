import React from 'react';
import { useSettings, type ArchiveJob } from '../../lib/SettingsContext';
import { validateArchiveJob } from '../../lib/validation';
import { Trash2, Plus, Trash } from 'lucide-react';

const ArchiveSettings: React.FC = () => {
  const { dataSource, setDataSource, hosts, connections } = useSettings();

  const handleJobChange = (id: string, field: keyof ArchiveJob, value: any) => {
    setDataSource(prev => ({
      ...prev,
      archiveJobs: (prev.archiveJobs || []).map(job =>
        job.id === id ? { ...job, [field]: value } : job
      )
    }));
  };

  const addJob = () => {
    const fileConnections = connections.filter(c => c.type === 'file');
    const defaultConn = fileConnections.length > 0 ? fileConnections[0] : null;
    const defaultHost = defaultConn ? hosts.find(h => h.name === defaultConn.host) : null;
    const defaultPath = defaultHost && defaultHost.directories.length > 0 ? defaultHost.directories[0] : '/source';

    const newJob: ArchiveJob = {
      id: `arc_job_${Date.now()}`,
      name: `Archive ${ (dataSource.archiveJobs?.length || 0) + 1}`,
      sourceConnectionId: defaultConn?.id || '',
      sourcePath: defaultPath,
      filterRegex: '.*\\.csv',
      targetConnectionId: defaultConn?.id || '',
      targetPath: defaultPath,
      fileNamePattern: 'archive_${timestamp}.tar',
      format: 'tar',
      enabled: true,
      executionInterval: 5000,
      deleteSourceAfterArchive: true
    };
    setDataSource(prev => ({ ...prev, archiveJobs: [...(prev.archiveJobs || []), newJob] }));
  };

  const removeJob = (id: string) => {
    setDataSource(prev => ({ ...prev, archiveJobs: (prev.archiveJobs || []).filter(j => j.id !== id) }));
  };

  return (
    <div className="space-y-4">
      {(dataSource.archiveJobs || []).map((job) => {
        const errors = validateArchiveJob(job);
        const hasError = (field: string) => errors.some(e => e.field === field);
        const getErrorMsg = (field: string) => errors.find(e => e.field === field)?.message;

        const srcConn = connections.find(c => c.id === job.sourceConnectionId);
        const srcHost = srcConn ? hosts.find(h => h.name === srcConn.host) : null;
        
        const tgtConn = connections.find(c => c.id === job.targetConnectionId);
        const tgtHost = tgtConn ? hosts.find(h => h.name === tgtConn.host) : null;

        return (
          <div key={job.id} className="border p-4 rounded-md bg-gray-50 relative">
             <div className="absolute top-2 right-2">
                <button onClick={() => removeJob(job.id)} className="text-red-500 hover:text-red-700" title="Delete Job">
                  <Trash2 size={18} />
                </button>
             </div>
             <div className="grid gap-3">
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

               <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-3 border-r pr-3">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Source Configuration</h4>
                    <div>
                        <label className="block text-xs font-medium text-gray-500">Source Connection</label>
                        <select
                            value={job.sourceConnectionId}
                            onChange={(e) => handleJobChange(job.id, 'sourceConnectionId', e.target.value)}
                            className={`w-full border rounded p-1 text-sm bg-white ${hasError('sourceConnectionId') ? 'border-red-500' : ''}`}
                            title={getErrorMsg('sourceConnectionId')}
                        >
                            <option value="">Select Connection...</option>
                            {connections.filter(c => c.type === 'file').map(conn => (
                                <option key={conn.id} value={conn.id}>{conn.name} ({conn.host})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500">Source Path</label>
                        <select
                            value={job.sourcePath}
                            onChange={(e) => handleJobChange(job.id, 'sourcePath', e.target.value)}
                            className={`w-full border rounded p-1 text-sm bg-white ${hasError('sourcePath') ? 'border-red-500' : ''}`}
                            title={getErrorMsg('sourcePath')}
                        >
                            <option value="">Select Path...</option>
                            {srcHost?.directories.map(dir => (
                                <option key={dir} value={dir}>{dir}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500">Filter Regex</label>
                        <input
                            type="text"
                            value={job.filterRegex}
                            onChange={(e) => handleJobChange(job.id, 'filterRegex', e.target.value)}
                            className={`w-full border rounded p-1 text-sm font-mono ${hasError('filterRegex') ? 'border-red-500' : ''}`}
                            placeholder=".*\.csv"
                            title={getErrorMsg('filterRegex')}
                        />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Target & Archive</h4>
                    <div>
                        <label className="block text-xs font-medium text-gray-500">Target Connection</label>
                        <select
                            value={job.targetConnectionId}
                            onChange={(e) => handleJobChange(job.id, 'targetConnectionId', e.target.value)}
                            className={`w-full border rounded p-1 text-sm bg-white ${hasError('targetConnectionId') ? 'border-red-500' : ''}`}
                            title={getErrorMsg('targetConnectionId')}
                        >
                            <option value="">Select Connection...</option>
                            {connections.filter(c => c.type === 'file').map(conn => (
                                <option key={conn.id} value={conn.id}>{conn.name} ({conn.host})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500">Target Path</label>
                        <select
                            value={job.targetPath}
                            onChange={(e) => handleJobChange(job.id, 'targetPath', e.target.value)}
                            className={`w-full border rounded p-1 text-sm bg-white ${hasError('targetPath') ? 'border-red-500' : ''}`}
                            title={getErrorMsg('targetPath')}
                        >
                            <option value="">Select Path...</option>
                            {tgtHost?.directories.map(dir => (
                                <option key={dir} value={dir}>{dir}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500">Archive Name Pattern</label>
                        <input
                            type="text"
                            value={job.fileNamePattern}
                            onChange={(e) => handleJobChange(job.id, 'fileNamePattern', e.target.value)}
                            className={`w-full border rounded p-1 text-sm ${hasError('fileNamePattern') ? 'border-red-500' : ''}`}
                            placeholder="bundle_${timestamp}.tar"
                            title={getErrorMsg('fileNamePattern')}
                        />
                    </div>
                  </div>
               </div>

               <div className="grid grid-cols-3 gap-3 border-t pt-3 items-end">
                   <div>
                        <label className="block text-xs font-medium text-gray-500">Format</label>
                        <select
                            value={job.format}
                            onChange={(e) => handleJobChange(job.id, 'format', e.target.value)}
                            className="w-full border rounded p-1 text-sm bg-white"
                        >
                            <option value="tar">TAR (Multi-file)</option>
                            <option value="gz">GZ</option>
                            <option value="zip">ZIP</option>
                        </select>
                   </div>
                   <div>
                        <label className="block text-xs font-medium text-gray-500">Interval (ms)</label>
                        <input
                            type="number"
                            value={job.executionInterval}
                            onChange={(e) => handleJobChange(job.id, 'executionInterval', parseInt(e.target.value) || 0)}
                            className={`w-full border rounded p-1 text-sm ${hasError('executionInterval') ? 'border-red-500' : ''}`}
                            title={getErrorMsg('executionInterval')}
                        />
                   </div>
                   <div className="flex items-center gap-2 pb-2">
                        <input
                            type="checkbox"
                            id={`del-${job.id}`}
                            checked={job.deleteSourceAfterArchive}
                            onChange={(e) => handleJobChange(job.id, 'deleteSourceAfterArchive', e.target.checked)}
                            className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor={`del-${job.id}`} className="text-xs text-gray-600 flex items-center gap-1 cursor-pointer">
                            <Trash size={12} /> Delete source after archive
                        </label>
                   </div>
               </div>
             </div>
          </div>
        );
      })}

      <button
          onClick={addJob}
          className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-500 hover:text-blue-500 transition-colors"
      >
          <Plus size={20} /> Add Archive Job
      </button>
    </div>
  );
};

export default ArchiveSettings;
