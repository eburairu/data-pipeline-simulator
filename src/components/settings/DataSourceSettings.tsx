import React from 'react';
import { useSettings, type DataSourceDefinition, type GenerationJob } from '../../lib/SettingsContext';
import { validateDataSourceDefinition, validateGenerationJob } from '../../lib/validation';
import { Trash2, Plus, FolderOpen, FileText } from 'lucide-react';

const DataSourceSettings: React.FC = () => {
  const { dataSource, setDataSource, hosts } = useSettings();

  // --- Definition Handlers ---

  const handleDefChange = (id: string, field: keyof DataSourceDefinition, value: any) => {
    setDataSource({
      ...dataSource,
      definitions: dataSource.definitions.map(def =>
        def.id === id ? { ...def, [field]: value } : def
      )
    });
  };

  const handleDefHostChange = (id: string, newHostName: string) => {
    const selectedHost = hosts.find(h => h.name === newHostName);
    const newPath = selectedHost && selectedHost.directories.length > 0 ? selectedHost.directories[0] : '';

    setDataSource({
      ...dataSource,
      definitions: dataSource.definitions.map(def =>
        def.id === id ? { ...def, host: newHostName, path: newPath } : def
      )
    });
  };

  const addDefinition = () => {
    const defaultHost = hosts.length > 0 ? hosts[0] : { name: 'localhost', directories: [] };
    const defaultPath = defaultHost.directories.length > 0 ? defaultHost.directories[0] : '/source';

    const newDef: DataSourceDefinition = {
      id: `ds_def_${Date.now()}`,
      name: `Location ${dataSource.definitions.length + 1}`,
      host: defaultHost.name,
      path: defaultPath,
    };
    setDataSource({ ...dataSource, definitions: [...dataSource.definitions, newDef] });
  };

  const removeDefinition = (id: string) => {
    // Note: We might want to warn if jobs are using this definition, but for now just allow delete.
    // Validation will flag jobs with missing definitions.
    setDataSource({
      ...dataSource,
      definitions: dataSource.definitions.filter(d => d.id !== id)
    });
  };

  // --- Job Handlers ---

  const handleJobChange = (id: string, field: keyof GenerationJob, value: any) => {
    setDataSource({
      ...dataSource,
      jobs: dataSource.jobs.map(job =>
        job.id === id ? { ...job, [field]: value } : job
      )
    });
  };

  const addJob = () => {
    const defaultDefId = dataSource.definitions.length > 0 ? dataSource.definitions[0].id : '';

    const newJob: GenerationJob = {
      id: `gen_job_${Date.now()}`,
      name: `Generator ${dataSource.jobs.length + 1}`,
      dataSourceId: defaultDefId,
      fileNamePattern: '${host}_data_${timestamp}.csv',
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
    <div className="space-y-6 p-4 border rounded bg-white shadow-sm">
      <h2 className="text-xl font-semibold text-gray-800 border-b pb-2 flex items-center gap-2">
          <FolderOpen className="w-5 h-5"/> Data Source Locations
      </h2>
      <p className="text-sm text-gray-500">Define the physical locations (Host & Path) where files will be generated or monitored.</p>

      <div className="space-y-4">
        {dataSource.definitions.map((def) => {
          const errors = validateDataSourceDefinition(def);
          const hasError = (field: string) => errors.some(e => e.field === field);
          const getErrorMsg = (field: string) => errors.find(e => e.field === field)?.message;

          return (
            <div key={def.id} className="border p-4 rounded-md bg-gray-50 relative">
               <div className="absolute top-2 right-2">
                  <button onClick={() => removeDefinition(def.id)} className="text-red-500 hover:text-red-700" title="Delete Location">
                    <Trash2 size={18} />
                  </button>
               </div>
               <div className="grid gap-3">
                   <div>
                     <label className="block text-xs font-medium text-gray-500">Location Name</label>
                     <input
                        type="text"
                        value={def.name}
                        onChange={(e) => handleDefChange(def.id, 'name', e.target.value)}
                        className={`w-full border rounded p-1 text-sm ${hasError('name') ? 'border-red-500 bg-red-50' : ''}`}
                        title={getErrorMsg('name')}
                     />
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-500">Host</label>
                            <select
                                value={def.host}
                                onChange={(e) => handleDefHostChange(def.id, e.target.value)}
                                className={`w-full border rounded p-1 text-sm bg-white ${hasError('host') ? 'border-red-500 bg-red-50' : ''}`}
                                title={getErrorMsg('host')}
                            >
                                {hosts.map(h => (
                                    <option key={h.name} value={h.name}>{h.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500">Path</label>
                            <select
                                value={def.path}
                                onChange={(e) => handleDefChange(def.id, 'path', e.target.value)}
                                className={`w-full border rounded p-1 text-sm bg-white ${hasError('path') ? 'border-red-500 bg-red-50' : ''}`}
                                title={getErrorMsg('path')}
                            >
                                {hosts.find(h => h.name === def.host)?.directories.map(dir => (
                                    <option key={dir} value={dir}>{dir}</option>
                                )) || <option value="">Select Host First</option>}
                            </select>
                        </div>
                   </div>
               </div>
            </div>
          );
        })}
        <button
          onClick={addDefinition}
          className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-500 hover:text-blue-500 transition-colors"
        >
          <Plus size={20} /> Add Location
        </button>
      </div>

      <h2 className="text-xl font-semibold text-gray-800 border-b pb-2 flex items-center gap-2 mt-8">
          <FileText className="w-5 h-5"/> File Generation Jobs
      </h2>
      <p className="text-sm text-gray-500">Configure rules for generating files into the Data Source Locations defined above.</p>

      <div className="space-y-4">
        {dataSource.jobs.map((job) => {
          const errors = validateGenerationJob(job, dataSource.definitions);
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
                        <label className="block text-xs font-medium text-gray-500">Target Location</label>
                        <select
                            value={job.dataSourceId}
                            onChange={(e) => handleJobChange(job.id, 'dataSourceId', e.target.value)}
                            className={`w-full border rounded p-1 text-sm bg-white ${hasError('dataSourceId') ? 'border-red-500 bg-red-50' : ''}`}
                            title={getErrorMsg('dataSourceId')}
                        >
                            <option value="">Select Target...</option>
                            {dataSource.definitions.map(def => (
                                <option key={def.id} value={def.id}>{def.name} ({def.host}:{def.path})</option>
                            ))}
                        </select>
                   </div>
                </div>
                 <div className="grid grid-cols-2 gap-3">
                   <div>
                     <label className="block text-xs font-medium text-gray-500">File Name Pattern</label>
                     <input
                        type="text"
                        value={job.fileNamePattern}
                        onChange={(e) => handleJobChange(job.id, 'fileNamePattern', e.target.value)}
                        className={`w-full border rounded p-1 text-sm ${hasError('fileNamePattern') ? 'border-red-500 bg-red-50' : ''}`}
                        title={getErrorMsg('fileNamePattern')}
                        placeholder="${host}_${timestamp}.csv"
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
                <div>
                     <label className="block text-xs font-medium text-gray-500">File Content Template</label>
                     <textarea
                        value={job.fileContent}
                        onChange={(e) => handleJobChange(job.id, 'fileContent', e.target.value)}
                        className="w-full border rounded p-1 text-sm font-mono h-24"
                        placeholder="col1,col2,col3&#10;data1,data2,data3"
                     />
                </div>
             </div>
          </div>
        );
        })}

        <button
            onClick={addJob}
            className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-500 hover:text-blue-500 transition-colors"
        >
            <Plus size={20} /> Add Generation Job
        </button>
      </div>

    </div>
  );
};

export default DataSourceSettings;
