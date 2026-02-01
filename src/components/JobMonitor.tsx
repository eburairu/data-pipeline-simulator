import React, { useState, useMemo, useEffect } from 'react';
import { useJobMonitor, type JobType, type JobStatus, type JobExecutionLog, type MappingExecutionDetails, type TransferExecutionDetails } from '../lib/JobMonitorContext';
import { useSettings } from '../lib/SettingsContext';
import MappingDesigner from './settings/MappingDesigner';
import { CheckCircle, XCircle, Filter, Trash2, Activity, Truck, Database, RotateCw, X, Info, AlertTriangle, Loader2, Workflow } from 'lucide-react';

const JobDetailModal: React.FC<{ log: JobExecutionLog; onClose: () => void }> = ({ log, onClose }) => {
  const isMapping = log.jobType === 'mapping';
  const isTransfer = log.jobType === 'collection' || log.jobType === 'delivery';
  const [showVisual, setShowVisual] = useState(false);
  const { mappingTasks } = useSettings();

  const mappingDetails = isMapping ? (log.extendedDetails as MappingExecutionDetails) : null;
  const transferDetails = isTransfer ? (log.extendedDetails as TransferExecutionDetails) : null;

  // Resolve mapping ID if it's a mapping job
  const mappingId = useMemo(() => {
      if (!isMapping) return null;
      const task = mappingTasks.find(t => t.id === log.jobId);
      return task ? task.mappingId : null;
  }, [isMapping, log.jobId, mappingTasks]);


  const getTypeIcon = (type: JobType) => {
    switch (type) {
      case 'collection': return <Truck size={20} className="text-orange-600" />;
      case 'delivery': return <Truck size={20} className="text-blue-600" />;
      case 'mapping': return <Database size={20} className="text-purple-600" />;
    }
  };

  const getStatusBadge = (status: JobStatus) => {
    switch (status) {
      case 'success': return <span className="font-bold flex items-center gap-1 text-green-600"><CheckCircle size={14} /> SUCCESS</span>;
      case 'failed': return <span className="font-bold flex items-center gap-1 text-red-600"><XCircle size={14} /> FAILED</span>;
      case 'running': return <span className="font-bold flex items-center gap-1 text-blue-600"><Loader2 size={14} className="animate-spin" /> RUNNING</span>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className={`bg-white rounded-lg shadow-xl w-full ${showVisual ? 'max-w-6xl h-[85vh]' : 'max-w-4xl max-h-[90vh]'} flex flex-col animate-in fade-in zoom-in duration-200 transition-all`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b bg-gray-50 rounded-t-lg shrink-0">
          <div className="flex items-center gap-3">
            {getTypeIcon(log.jobType)}
            <div>
              <h3 className="font-bold text-lg text-gray-800 leading-tight">{log.jobName}</h3>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">{log.jobType} Job</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isMapping && mappingId && (
                <button
                    onClick={() => setShowVisual(!showVisual)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded border text-sm font-medium transition-colors ${showVisual ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                >
                    <Workflow size={16} />
                    {showVisual ? 'Show Log Details' : 'Visualize Flow'}
                </button>
            )}
            <button onClick={onClose} className="p-2 rounded hover:bg-gray-200 text-gray-500 transition-colors"><X size={20} /></button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto p-6 space-y-6">
          {showVisual && isMapping && mappingDetails ? (
              <div className="h-full min-h-[500px] border rounded shadow-inner bg-gray-100">
                  <MappingDesigner
                      readOnly={true}
                      initialMappingId={mappingId || undefined}
                      executionStats={mappingDetails as any}
                  />
              </div>
          ) : (
            <>
              {/* Summary Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-3 rounded border border-gray-100">
                  <span className="block text-xs text-gray-500 uppercase">Status</span>
                  {getStatusBadge(log.status)}
                </div>
                <div className="bg-gray-50 p-3 rounded border border-gray-100">
                  <span className="block text-xs text-gray-500 uppercase">Duration</span>
                  <span className="font-mono font-medium text-gray-700">
                    {log.endTime ? ((log.endTime - log.startTime) / 1000).toFixed(2) + 's' : 'Running...'}
                  </span>
                </div>
                <div className="bg-gray-50 p-3 rounded border border-gray-100">
                  <span className="block text-xs text-gray-500 uppercase">Processed Records</span>
                  <span className="font-mono font-medium text-gray-700">
                    {log.recordsInput} In / {log.recordsOutput} Out
                  </span>
                </div>
                <div className="bg-gray-50 p-3 rounded border border-gray-100">
                  <span className="block text-xs text-gray-500 uppercase">Executed At</span>
                  <span className="font-mono font-medium text-gray-700">
                    {new Date(log.startTime).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              {/* Error Message */}
              {log.errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700 flex items-start gap-3">
                  <AlertTriangle className="shrink-0 mt-0.5" size={20} />
                  <div className="flex-grow">
                    <div className="font-bold text-sm">Execution Failed</div>
                    <div className="text-sm mt-1 font-mono break-all bg-white/50 p-2 rounded border border-red-100">
                      {log.errorMessage}
                    </div>
                  </div>
                </div>
              )}

              {/* Details Text */}
              {log.details && (
                <div className="text-sm text-gray-600 bg-blue-50/50 p-3 rounded border border-blue-100 flex gap-2">
                  <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
                  <span>{log.details}</span>
                </div>
              )}

              {/* Mapping Specifics: Transformation Stats */}
              {isMapping && mappingDetails && (
                <div className="space-y-3">
                  <h4 className="font-bold text-gray-700 flex items-center gap-2 border-b pb-2">
                    <Activity size={18} className="text-purple-500" /> Transformation Statistics
                  </h4>
                  <div className="border rounded-lg overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 text-gray-600">
                        <tr>
                          <th className="p-3 text-left font-semibold">Transformation</th>
                          <th className="p-3 text-right font-semibold">Input</th>
                          <th className="p-3 text-right font-semibold">Output</th>
                          <th className="p-3 text-right font-semibold text-red-600">Errors</th>
                          <th className="p-3 text-right font-semibold text-orange-600">Rejects</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {Object.entries(mappingDetails.transformations).map(([id, stats]) => (
                          <tr key={id} className={`transition-colors ${stats.errors > 0 ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                            <td className="p-3 font-medium text-gray-800">{stats.name || id}</td>
                            <td className="p-3 text-right font-mono text-gray-600">{stats.input}</td>
                            <td className="p-3 text-right font-mono text-gray-600">{stats.output}</td>
                            <td className={`p-3 text-right font-mono ${stats.errors > 0 ? 'text-red-700 font-bold' : 'text-gray-300'}`}>{stats.errors}</td>
                            <td className={`p-3 text-right font-mono ${stats.rejects > 0 ? 'text-orange-600 font-bold' : 'text-gray-300'}`}>{stats.rejects}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Transfer Specifics */}
              {isTransfer && transferDetails && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                  <h4 className="font-bold text-blue-800 flex items-center gap-2">
                    <Info size={18} /> Transfer Metrics
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
                    <div>
                      <span className="text-blue-600 block text-xs uppercase tracking-wider mb-1">File Size</span>
                      <span className="font-mono font-bold text-lg text-blue-900">{transferDetails.fileSize?.toLocaleString() ?? 0}</span> <span className="text-blue-400 text-xs">bytes</span>
                    </div>
                    <div>
                      <span className="text-blue-600 block text-xs uppercase tracking-wider mb-1">Throughput</span>
                      <span className="font-mono font-bold text-lg text-blue-900">{(transferDetails.throughput || 0).toFixed(2)}</span> <span className="text-blue-400 text-xs">B/s</span>
                    </div>
                    <div>
                      <span className="text-blue-600 block text-xs uppercase tracking-wider mb-1">Bandwidth Cap</span>
                      <span className="font-mono font-bold text-lg text-blue-900">{transferDetails.bandwidth || '∞'}</span> <span className="text-blue-400 text-xs">B/s</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Reject Rows (if any) */}
              {mappingDetails?.rejectRows && mappingDetails.rejectRows.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-red-700 flex items-center gap-2 border-b border-red-200 pb-2">
                    <XCircle size={18} /> Rejected Rows Detail
                  </h4>
                  <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto shadow-inner">
                    <table className="w-full text-left border-collapse text-xs font-mono">
                      <thead>
                        <tr className="text-gray-500 border-b border-gray-700">
                          <th className="p-2 w-32">Transformation</th>
                          <th className="p-2 w-48">Error</th>
                          <th className="p-2">Row Data</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {mappingDetails.rejectRows.map((r, i) => (
                          <tr key={i}>
                            <td className="p-2 text-orange-400 align-top">{r.transformationName}</td>
                            <td className="p-2 text-red-400 align-top">{r.error}</td>
                            <td className="p-2 text-gray-300 whitespace-pre-wrap">{JSON.stringify(r.row, null, 2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50 rounded-b-lg flex justify-end">
          <button onClick={onClose} className="px-5 py-2 bg-white border border-gray-300 rounded shadow-sm text-sm font-medium hover:bg-gray-50 text-gray-700 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const JobMonitor: React.FC = () => {
  const { logs, clearLogs, retryJob } = useJobMonitor();
  const [statusFilter, setStatusFilter] = useState<'all' | JobStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | JobType>('all');
  const [selectedLog, setSelectedLog] = useState<JobExecutionLog | null>(null);

  // Force re-render to update running times
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const statusMatch = statusFilter === 'all' || log.status === statusFilter;
      const typeMatch = typeFilter === 'all' || log.jobType === typeFilter;
      return statusMatch && typeMatch;
    });
  }, [logs, statusFilter, typeFilter]);

  const getTypeIcon = (type: JobType) => {
    switch (type) {
      case 'collection': return <Truck size={16} className="text-orange-600" />;
      case 'delivery': return <Truck size={16} className="text-blue-600" />;
      case 'mapping': return <Database size={16} className="text-purple-600" />;
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatDuration = (start: number, end?: number) => {
    const e = end || Date.now();
    const diff = e - start;
    if (diff < 1000) return `${diff}ms`;
    return `${(diff / 1000).toFixed(2)}s`;
  };

  return (
    <>
      <div className="h-full flex flex-col bg-white rounded shadow-sm border border-gray-200">
        {/* Header / Toolbar */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t">
          <div className="flex items-center gap-4">
            <h2 className="font-bold text-gray-700 flex items-center gap-2">
              <Activity className="w-5 h-5 text-gray-500" />
              Job Monitor
            </h2>

            <div className="flex items-center gap-2 text-sm border-l pl-4 border-gray-300">
              <div className="flex items-center gap-1">
                <Filter size={14} className="text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="border border-gray-300 rounded px-2 py-1 text-gray-700 focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="running">Running</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="border border-gray-300 rounded px-2 py-1 text-gray-700 focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="collection">Collection</option>
                  <option value="delivery">Delivery</option>
                  <option value="mapping">Mapping</option>
                </select>
              </div>
            </div>
          </div>

          <button
            onClick={clearLogs}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 px-3 py-1 rounded border border-gray-300 hover:border-red-300 transition-colors"
          >
            <Trash2 size={14} />
            Clear Log
          </button>
        </div>

        {/* Log List */}
        <div className="flex-grow overflow-auto p-0 bg-gray-50/50">
          {/* Mobile View (Cards) */}
          <div className="md:hidden space-y-2 p-2">
            {filteredLogs.length === 0 ? (
              <div className="p-8 text-center text-gray-400 italic">
                No execution logs found.
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="bg-white p-3 rounded shadow-sm border border-gray-200 space-y-2 active:bg-blue-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {getTypeIcon(log.jobType)}
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-gray-800 text-sm truncate">{log.jobName}</span>
                        <span className="text-[10px] text-gray-500 uppercase">{log.jobType}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0 ml-2">
                       <span className="text-xs text-gray-500 font-mono">{formatTime(log.startTime)}</span>
                       <span className="text-[10px] text-gray-400 font-mono">{formatDuration(log.startTime, log.endTime)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                     <div className="flex items-center gap-2">
                        {log.status === 'success' ? (
                          <span className="inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                            <CheckCircle size={12} /> Success
                          </span>
                        ) : log.status === 'failed' ? (
                          <span className="inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                            <XCircle size={12} /> Failed
                          </span>
                        ) : (
                           <span className="inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                            <Loader2 size={12} className="animate-spin" /> Running
                          </span>
                        )}
                     </div>
                     <div className="font-mono text-gray-600">
                        <span className="text-gray-500">In:</span> {log.recordsInput} <span className="text-gray-300">|</span> <span className="text-gray-500">Out:</span> {log.recordsOutput}
                     </div>
                  </div>

                  {log.errorMessage && (
                    <div className="text-xs text-red-600 bg-red-50 p-1.5 rounded border border-red-100 truncate">
                      {log.errorMessage}
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-100 flex justify-end" onClick={e => e.stopPropagation()}>
                    <button
                        onClick={() => retryJob(log.jobId, log.jobType)}
                        className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                      >
                        <RotateCw size={14} /> Retry Job
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop View (Table) */}
          <table className="hidden md:table w-full text-left text-sm bg-white">
            <thead className="bg-gray-100 text-gray-600 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-3 font-semibold w-24">Time</th>
                <th className="p-3 font-semibold w-32">Type</th>
                <th className="p-3 font-semibold w-48">Job Name</th>
                <th className="p-3 font-semibold w-24">Status</th>
                <th className="p-3 font-semibold w-32 text-right">Duration</th>
                <th className="p-3 font-semibold w-32 text-right">Records (In/Out)</th>
                <th className="p-3 font-semibold">Details / Message</th>
                <th className="p-3 font-semibold w-16 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400 italic">
                    No execution logs found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-blue-50 transition-colors cursor-pointer group"
                  >
                    <td className="p-3 text-gray-500 whitespace-nowrap font-mono text-xs">
                      {formatTime(log.startTime)}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(log.jobType)}
                        <span className="capitalize">{log.jobType}</span>
                      </div>
                    </td>
                    <td className="p-3 font-medium text-gray-700 truncate max-w-[200px]" title={log.jobName}>
                      {log.jobName}
                    </td>
                    <td className="p-3">
                      {log.status === 'success' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          <CheckCircle size={12} /> Success
                        </span>
                      ) : log.status === 'failed' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                          <XCircle size={12} /> Failed
                        </span>
                      ) : (
                         <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          <Loader2 size={12} className="animate-spin" /> Running
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right text-gray-500 font-mono text-xs">
                      {formatDuration(log.startTime, log.endTime)}
                    </td>
                    <td className="p-3 text-right font-mono text-xs">
                      <span className="text-gray-600">{log.recordsInput}</span>
                      <span className="text-gray-300 mx-1">/</span>
                      <span className="text-gray-900 font-semibold">{log.recordsOutput}</span>
                    </td>
                    <td className="p-3 text-gray-600 truncate max-w-[300px]" title={log.errorMessage || log.details}>
                      <div className="flex justify-between items-center gap-2">
                        {log.errorMessage ? (
                          <span className="text-red-600 flex items-center gap-1 truncate">
                            {log.errorMessage}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs truncate">{log.details}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => retryJob(log.jobId, log.jobType)}
                        className="text-gray-400 hover:text-blue-600 transition-colors p-1 rounded hover:bg-blue-100"
                        title="Retry Job"
                      >
                        <RotateCw size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedLog && (
        <JobDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </>
  );
};

export default JobMonitor;
