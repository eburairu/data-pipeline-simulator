import React from 'react';
import { useSettings, type DataSourceDefinition, type GenerationJob, type ColumnSchema, type GeneratorType } from '../../lib/SettingsContext';
import { validateDataSourceDefinition, validateGenerationJob, type ValidationError } from '../../lib/validation';
import { Trash2, Plus, FolderOpen, FileText, AlignJustify, List } from 'lucide-react';

const GENERATOR_TYPES: GeneratorType[] = ['static', 'randomInt', 'randomFloat', 'sin', 'cos', 'sequence', 'uuid', 'list'];

const SchemaEditor: React.FC<{
    schema: ColumnSchema[];
    onChange: (schema: ColumnSchema[]) => void;
    errors: ValidationError[];
    jobId: string;
}> = ({ schema, onChange }) => {

    const addColumn = () => {
        const newCol: ColumnSchema = {
            id: `col_${Date.now()}`,
            name: `column${schema.length + 1}`,
            type: 'static',
            params: { value: '' }
        };
        onChange([...schema, newCol]);
    };

    const removeColumn = (id: string) => {
        onChange(schema.filter(c => c.id !== id));
    };

    const updateColumn = (id: string, updates: Partial<ColumnSchema>) => {
        onChange(schema.map(c => c.id === id ? { ...c, ...updates } : c));
    };

    const updateParams = (id: string, key: string, value: any) => {
        const col = schema.find(c => c.id === id);
        if (!col) return;
        updateColumn(id, { params: { ...col.params, [key]: value } });
    };

    return (
        <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 border-b pb-1 mb-2">
                <div className="col-span-3">Column Name</div>
                <div className="col-span-3">Type</div>
                <div className="col-span-5">Parameters</div>
                <div className="col-span-1"></div>
            </div>
            {schema.map((col) => (
                <div key={col.id} className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-3">
                        <input
                            type="text"
                            value={col.name}
                            onChange={(e) => updateColumn(col.id, { name: e.target.value })}
                            className="w-full border rounded p-1 text-sm"
                            placeholder="Name"
                        />
                    </div>
                    <div className="col-span-3">
                        <select
                            value={col.type}
                            onChange={(e) => updateColumn(col.id, { type: e.target.value as GeneratorType, params: {} })}
                            className="w-full border rounded p-1 text-sm bg-white"
                        >
                            {GENERATOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="col-span-5">
                        {/* Dynamic Params Inputs */}
                        <div className="grid grid-cols-2 gap-1">
                            {col.type === 'static' && (
                                <input type="text" placeholder="Value (Template supported)" className="col-span-2 border rounded p-1 text-sm" value={col.params.value || ''} onChange={e => updateParams(col.id, 'value', e.target.value)} />
                            )}
                            {col.type === 'randomInt' && (
                                <>
                                    <input type="number" placeholder="Min" className="border rounded p-1 text-sm" value={col.params.min ?? 0} onChange={e => updateParams(col.id, 'min', e.target.value)} />
                                    <input type="number" placeholder="Max" className="border rounded p-1 text-sm" value={col.params.max ?? 100} onChange={e => updateParams(col.id, 'max', e.target.value)} />
                                </>
                            )}
                            {col.type === 'randomFloat' && (
                                <>
                                    <input type="number" placeholder="Min" className="border rounded p-1 text-sm" value={col.params.min ?? 0} onChange={e => updateParams(col.id, 'min', e.target.value)} />
                                    <input type="number" placeholder="Max" className="border rounded p-1 text-sm" value={col.params.max ?? 1} onChange={e => updateParams(col.id, 'max', e.target.value)} />
                                    <input type="number" placeholder="Precision" className="col-span-2 border rounded p-1 text-sm" value={col.params.precision ?? 2} onChange={e => updateParams(col.id, 'precision', e.target.value)} />
                                </>
                            )}
                            {(col.type === 'sin' || col.type === 'cos') && (
                                <>
                                    <input type="number" placeholder="Period (ms)" className="border rounded p-1 text-sm" value={col.params.period ?? 10000} onChange={e => updateParams(col.id, 'period', e.target.value)} />
                                    <input type="number" placeholder="Amplitude" className="border rounded p-1 text-sm" value={col.params.amplitude ?? 1} onChange={e => updateParams(col.id, 'amplitude', e.target.value)} />
                                    <input type="number" placeholder="Offset" className="col-span-2 border rounded p-1 text-sm" value={col.params.offset ?? 0} onChange={e => updateParams(col.id, 'offset', e.target.value)} />
                                </>
                            )}
                             {col.type === 'sequence' && (
                                <>
                                    <input type="number" placeholder="Start" className="border rounded p-1 text-sm" value={col.params.start ?? 1} onChange={e => updateParams(col.id, 'start', e.target.value)} />
                                    <input type="number" placeholder="Step" className="border rounded p-1 text-sm" value={col.params.step ?? 1} onChange={e => updateParams(col.id, 'step', e.target.value)} />
                                </>
                            )}
                             {col.type === 'list' && (
                                <input type="text" placeholder="Values (comma separated)" className="col-span-2 border rounded p-1 text-sm" value={col.params.values || ''} onChange={e => updateParams(col.id, 'values', e.target.value)} />
                            )}
                             {col.type === 'uuid' && (
                                <span className="col-span-2 text-xs text-gray-400 italic flex items-center">Generates unique ID</span>
                            )}
                        </div>
                    </div>
                    <div className="col-span-1 flex justify-end">
                        <button onClick={() => removeColumn(col.id)} className="text-gray-400 hover:text-red-500">
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            ))}
            <button
                onClick={addColumn}
                className="w-full flex items-center justify-center gap-2 py-1 border border-dashed border-gray-300 rounded-md text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors text-xs"
            >
                <Plus size={14} /> Add Column
            </button>
        </div>
    );
};

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
      mode: 'schema',
      rowCount: 1,
      schema: [
          { id: `c_${Date.now()}_1`, name: 'id', type: 'sequence', params: { start: 1, step: 1 } },
          { id: `c_${Date.now()}_2`, name: 'value', type: 'randomInt', params: { min: 0, max: 100 } }
      ],
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
          const currentMode = job.mode || 'template';

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

                {/* Mode Selector */}
                <div className="flex items-center gap-4 border-t pt-3 mt-1">
                    <label className="text-xs font-medium text-gray-500">Generation Mode:</label>
                    <div className="flex bg-gray-100 rounded p-1">
                        <button
                            onClick={() => handleJobChange(job.id, 'mode', 'template')}
                            className={`px-3 py-1 rounded text-xs flex items-center gap-1 ${currentMode === 'template' ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <AlignJustify size={14} /> Template Text
                        </button>
                        <button
                            onClick={() => handleJobChange(job.id, 'mode', 'schema')}
                            className={`px-3 py-1 rounded text-xs flex items-center gap-1 ${currentMode === 'schema' ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <List size={14} /> Schema List
                        </button>
                    </div>
                </div>

                {currentMode === 'template' ? (
                     <div>
                         <label className="block text-xs font-medium text-gray-500">File Content Template</label>
                         <textarea
                            value={job.fileContent}
                            onChange={(e) => handleJobChange(job.id, 'fileContent', e.target.value)}
                            className="w-full border rounded p-1 text-sm font-mono h-32"
                            placeholder="col1,col2,col3&#10;data1,data2,data3"
                         />
                    </div>
                ) : (
                    <div>
                         <div className="mb-2">
                             <label className="block text-xs font-medium text-gray-500 mb-1">Rows per Execution</label>
                             <input
                                type="number"
                                value={job.rowCount || 1}
                                onChange={(e) => handleJobChange(job.id, 'rowCount', parseInt(e.target.value) || 1)}
                                className={`w-32 border rounded p-1 text-sm ${hasError('rowCount') ? 'border-red-500' : ''}`}
                             />
                         </div>
                         <label className="block text-xs font-medium text-gray-500 mb-1">Column Definitions</label>
                         {hasError('schema') && <p className="text-xs text-red-500 mb-1">{getErrorMsg('schema')}</p>}
                         <div className="border rounded p-2 bg-gray-50">
                             <SchemaEditor
                                schema={job.schema || []}
                                onChange={(newSchema) => handleJobChange(job.id, 'schema', newSchema)}
                                errors={errors}
                                jobId={job.id}
                             />
                         </div>
                    </div>
                )}
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
