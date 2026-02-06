import React from 'react';
import { useSettings, type GenerationJob, type ColumnSchema, type GeneratorType, type CompressionFormat } from '../../lib/SettingsContext';
import { validateGenerationJob, type ValidationError } from '../../lib/validation';
import { Trash2, Plus, FileText, AlignJustify, List, Archive } from 'lucide-react';

const GENERATOR_TYPES: GeneratorType[] = ['static', 'randomInt', 'randomFloat', 'sin', 'cos', 'sequence', 'uuid', 'list', 'timestamp'];

const CompressionActionsEditor: React.FC<{ actions: CompressionFormat[], onChange: (actions: CompressionFormat[]) => void }> = ({ actions, onChange }) => {
    const addAction = (format: CompressionFormat) => onChange([...actions, format]);
    const removeAction = (index: number) => onChange(actions.filter((_, i) => i !== index));

    return (
        <div className="flex flex-col gap-1">
            <div className="flex flex-wrap gap-2 items-center min-h-[24px]">
                {actions.length === 0 && <span className="text-gray-400 text-xs italic">No compression</span>}
                {actions.map((action, i) => (
                    <div key={i} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs flex items-center gap-1 border border-blue-200">
                        {action}
                        <button onClick={() => removeAction(i)} className="text-blue-500 hover:text-red-500 font-bold px-1">×</button>
                    </div>
                ))}
            </div>
            <div className="flex gap-2 mt-1">
                {(['gz', 'tar', 'zip'] as CompressionFormat[]).map(fmt => (
                    <button 
                        key={fmt} 
                        onClick={() => addAction(fmt)} 
                        className="px-2 py-0.5 text-xs border rounded hover:bg-gray-50 text-gray-600 flex items-center gap-1"
                    >
                        <Plus size={10} /> {fmt}
                    </button>
                ))}
            </div>
        </div>
    );
};

const ParamInput = ({ label, id, ...props }: any) => {
    const inputId = id || `param-${label?.replace(/\s+/g, '-').toLowerCase()}-${Math.random().toString(36).slice(2, 6)}`;
    return (
        <div className="flex flex-col">
            <label htmlFor={inputId} className="text-[10px] text-gray-500 font-medium ml-1 mb-0.5">{label}</label>
            <input id={inputId} className="border rounded p-1 text-sm w-full" {...props} />
        </div>
    );
};

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
                            aria-label="列名"
                        />
                    </div>
                    <div className="col-span-3">
                        <select
                            value={col.type}
                            onChange={(e) => updateColumn(col.id, { type: e.target.value as GeneratorType, params: {} })}
                            className="w-full border rounded p-1 text-sm bg-white"
                            aria-label="列の型"
                        >
                            {GENERATOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="col-span-5">
                        {/* Dynamic Params Inputs */}
                        <div className="grid grid-cols-2 gap-1 items-end">
                            {col.type === 'static' && (
                                <div className="col-span-2">
                                    <ParamInput label="Value (Template)" type="text" value={col.params.value || ''} onChange={(e: any) => updateParams(col.id, 'value', e.target.value)} />
                                </div>
                            )}
                            {col.type === 'randomInt' && (
                                <>
                                    <ParamInput label="Min" type="number" value={col.params.min ?? 0} onChange={(e: any) => updateParams(col.id, 'min', e.target.value)} />
                                    <ParamInput label="Max" type="number" value={col.params.max ?? 100} onChange={(e: any) => updateParams(col.id, 'max', e.target.value)} />
                                </>
                            )}
                            {col.type === 'randomFloat' && (
                                <>
                                    <ParamInput label="Min" type="number" value={col.params.min ?? 0} onChange={(e: any) => updateParams(col.id, 'min', e.target.value)} />
                                    <ParamInput label="Max" type="number" value={col.params.max ?? 1} onChange={(e: any) => updateParams(col.id, 'max', e.target.value)} />
                                    <div className="col-span-2">
                                        <ParamInput label="Precision" type="number" value={col.params.precision ?? 2} onChange={(e: any) => updateParams(col.id, 'precision', e.target.value)} />
                                    </div>
                                </>
                            )}
                            {(col.type === 'sin' || col.type === 'cos') && (
                                <>
                                    <ParamInput label="Period (ms)" type="number" value={col.params.period ?? 10000} onChange={(e: any) => updateParams(col.id, 'period', e.target.value)} />
                                    <ParamInput label="Amplitude" type="number" value={col.params.amplitude ?? 1} onChange={(e: any) => updateParams(col.id, 'amplitude', e.target.value)} />
                                    <div className="col-span-2">
                                        <ParamInput label="Offset" type="number" value={col.params.offset ?? 0} onChange={(e: any) => updateParams(col.id, 'offset', e.target.value)} />
                                    </div>
                                </>
                            )}
                             {col.type === 'sequence' && (
                                <>
                                    <ParamInput label="Start" type="number" value={col.params.start ?? 1} onChange={(e: any) => updateParams(col.id, 'start', e.target.value)} />
                                    <ParamInput label="Step" type="number" value={col.params.step ?? 1} onChange={(e: any) => updateParams(col.id, 'step', e.target.value)} />
                                </>
                            )}
                             {col.type === 'list' && (
                                <div className="col-span-2">
                                    <ParamInput label="Values (comma separated)" type="text" value={col.params.values || ''} onChange={(e: any) => updateParams(col.id, 'values', e.target.value)} />
                                </div>
                            )}
                             {col.type === 'uuid' && (
                                <span className="col-span-2 text-xs text-gray-400 italic flex items-center h-full pt-4">Generates unique ID</span>
                            )}
                             {col.type === 'timestamp' && (
                                <span className="col-span-2 text-xs text-gray-400 italic flex items-center h-full pt-4">Current ISO Timestamp</span>
                            )}
                        </div>
                    </div>
                    <div className="col-span-1 flex justify-end">
                        <button onClick={() => removeColumn(col.id)} className="text-gray-400 hover:text-red-500" aria-label={`列 ${col.name} を削除`}>
                            <Trash2 size={16} aria-hidden="true" />
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
  const { dataSource, setDataSource, hosts, connections } = useSettings();

  // --- Job Handlers ---

  const handleJobChange = (id: string, field: keyof GenerationJob, value: any) => {
    setDataSource(prev => ({
      ...prev,
      jobs: prev.jobs.map(job =>
        job.id === id ? { ...job, [field]: value } : job
      )
    }));
  };

  const addJob = () => {
    // Default to first file connection
    const fileConnections = connections.filter(c => c.type === 'file');
    const defaultConn = fileConnections.length > 0 ? fileConnections[0] : null;
    const defaultHost = defaultConn ? hosts.find(h => h.name === defaultConn.host) : null;
    const defaultPath = defaultHost && defaultHost.directories.length > 0 ? defaultHost.directories[0] : '/source';

    const newJob: GenerationJob = {
      id: `gen_job_${Date.now()}`,
      name: `Generator ${dataSource.jobs.length + 1}`,
      connectionId: defaultConn?.id || '',
      path: defaultPath,
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
    setDataSource(prev => ({ ...prev, jobs: [...prev.jobs, newJob] }));
  };

  const removeJob = (id: string) => {
    setDataSource(prev => ({ ...prev, jobs: prev.jobs.filter(j => j.id !== id) }));
  };

  return (
    <div className="space-y-6 p-4 border rounded bg-white shadow-sm">
      <h2 className="text-xl font-semibold text-gray-800 border-b pb-2 flex items-center gap-2">
          <FileText className="w-5 h-5"/> File Generation Jobs
      </h2>
      <p className="text-sm text-gray-500">Configure rules for generating files into the Data Source Locations defined by File Connections.</p>

      <div className="space-y-4">
        {dataSource.jobs.map((job) => {
          const errors = validateGenerationJob(job);
          const hasError = (field: string) => errors.some(e => e.field === field);
          const getErrorMsg = (field: string) => errors.find(e => e.field === field)?.message;
          const currentMode = job.mode || 'template';

          // Get host for current connection to list directories
          const currentConn = connections.find(c => c.id === job.connectionId);
          const currentHost = currentConn ? hosts.find(h => h.name === currentConn.host) : null;

          return (
          <div key={job.id} className="border p-4 rounded-md bg-gray-50 relative">
             <div className="absolute top-2 right-2">
                <button onClick={() => removeJob(job.id)} className="text-red-500 hover:text-red-700" title="Delete Job" aria-label={`ジョブ ${job.name} を削除`}>
                  <Trash2 size={18} aria-hidden="true" />
                </button>
             </div>
             <div className="grid gap-3">
               <div>
                 <label htmlFor={`job-name-${job.id}`} className="block text-xs font-medium text-gray-500">Job Name</label>
                 <input
                    id={`job-name-${job.id}`}
                    type="text"
                    value={job.name}
                    onChange={(e) => handleJobChange(job.id, 'name', e.target.value)}
                    className={`w-full border rounded p-1 text-sm ${hasError('name') ? 'border-red-500 bg-red-50' : ''}`}
                    title={getErrorMsg('name')}
                 />
               </div>
               <div className="grid grid-cols-2 gap-3">
                   <div>
                        <label htmlFor={`job-conn-${job.id}`} className="block text-xs font-medium text-gray-500">Target Connection (File)</label>
                        <select
                            id={`job-conn-${job.id}`}
                            value={job.connectionId}
                            onChange={(e) => {
                                const newConnId = e.target.value;
                                // 新しいコネクションのホストを取得し、最初のディレクトリをデフォルト設定
                                const newConn = connections.find(c => c.id === newConnId);
                                const newHost = newConn ? hosts.find(h => h.name === newConn.host) : null;
                                const defaultPath = newHost && newHost.directories.length > 0 ? newHost.directories[0] : '';
                                setDataSource(prev => ({
                                    ...prev,
                                    jobs: prev.jobs.map(j =>
                                        j.id === job.id
                                        ? { ...j, connectionId: newConnId, path: defaultPath }
                                        : j
                                    )
                                }));
                            }}
                            className={`w-full border rounded p-1 text-sm bg-white ${hasError('connectionId') ? 'border-red-500 bg-red-50' : ''}`}
                            title={getErrorMsg('connectionId')}
                        >
                            <option value="">Select Connection...</option>
                            {connections.filter(c => c.type === 'file').map(conn => (
                                <option key={conn.id} value={conn.id}>{conn.name} ({conn.host})</option>
                            ))}
                        </select>
                   </div>
                   <div>
                        <label htmlFor={`job-path-${job.id}`} className="block text-xs font-medium text-gray-500">Target Path</label>
                        <select
                            id={`job-path-${job.id}`}
                            value={job.path}
                            onChange={(e) => handleJobChange(job.id, 'path', e.target.value)}
                            className={`w-full border rounded p-1 text-sm bg-white ${hasError('path') ? 'border-red-500 bg-red-50' : ''}`}
                            title={getErrorMsg('path')}
                            disabled={!job.connectionId}
                        >
                            <option value="">Select Path...</option>
                            {currentHost?.directories.map(dir => (
                                <option key={dir} value={dir}>{dir}</option>
                            ))}
                        </select>
                   </div>
                </div>
                 <div className="grid grid-cols-2 gap-3">
                   <div>
                     <label htmlFor={`job-pattern-${job.id}`} className="block text-xs font-medium text-gray-500">File Name Pattern</label>
                     <input
                        id={`job-pattern-${job.id}`}
                        type="text"
                        value={job.fileNamePattern}
                        onChange={(e) => handleJobChange(job.id, 'fileNamePattern', e.target.value)}
                        className={`w-full border rounded p-1 text-sm ${hasError('fileNamePattern') ? 'border-red-500 bg-red-50' : ''}`}
                        title={getErrorMsg('fileNamePattern')}
                        placeholder="${host}_${timestamp}.csv"
                     />
                   </div>
                   <div>
                     <label htmlFor={`job-interval-${job.id}`} className="block text-xs font-medium text-gray-500">Interval (ms)</label>
                     <input
                        id={`job-interval-${job.id}`}
                        type="number"
                        value={job.executionInterval}
                        onChange={(e) => handleJobChange(job.id, 'executionInterval', parseInt(e.target.value) || 0)}
                        className={`w-full border rounded p-1 text-sm ${hasError('executionInterval') ? 'border-red-500 bg-red-50' : ''}`}
                        title={getErrorMsg('executionInterval')}
                     />
                   </div>
                </div>

                <div className="border-t pt-3 mt-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                        <Archive size={14} /> Compression Actions (Applied sequentially)
                    </label>
                    <CompressionActionsEditor 
                        actions={job.compressionActions || []} 
                        onChange={(newActions) => handleJobChange(job.id, 'compressionActions', newActions)} 
                    />
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
                         <label htmlFor={`job-content-${job.id}`} className="block text-xs font-medium text-gray-500">File Content Template</label>
                         <textarea
                            id={`job-content-${job.id}`}
                            value={job.fileContent}
                            onChange={(e) => handleJobChange(job.id, 'fileContent', e.target.value)}
                            className="w-full border rounded p-1 text-sm font-mono h-32"
                            placeholder="col1,col2,col3&#10;data1,data2,data3"
                         />
                    </div>
                ) : (
                    <div>
                         <div className="mb-2">
                             <label htmlFor={`job-rows-${job.id}`} className="block text-xs font-medium text-gray-500 mb-1">Rows per Execution</label>
                             <input
                                id={`job-rows-${job.id}`}
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
