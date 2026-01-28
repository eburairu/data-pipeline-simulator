import React, { useState, useMemo } from 'react';
import { useJobMonitor, type JobType, type JobStatus } from '../lib/JobMonitorContext';
import { CheckCircle, XCircle, Filter, Trash2, Activity, Truck, Database } from 'lucide-react';

const JobMonitor: React.FC = () => {
  const { logs, clearLogs } = useJobMonitor();
  const [statusFilter, setStatusFilter] = useState<'all' | JobStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | JobType>('all');

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

  const formatDuration = (start: number, end: number) => {
    const diff = end - start;
    if (diff < 1000) return `${diff}ms`;
    return `${(diff / 1000).toFixed(2)}s`;
  };

  return (
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

      {/* Log Table */}
      <div className="flex-grow overflow-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 text-gray-600 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="p-3 font-semibold w-24">Time</th>
              <th className="p-3 font-semibold w-32">Type</th>
              <th className="p-3 font-semibold w-48">Job Name</th>
              <th className="p-3 font-semibold w-24">Status</th>
              <th className="p-3 font-semibold w-32 text-right">Duration</th>
              <th className="p-3 font-semibold w-32 text-right">Records (In/Out)</th>
              <th className="p-3 font-semibold">Details / Message</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-400 italic">
                  No execution logs found.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
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
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                        <XCircle size={12} /> Failed
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
                    {log.errorMessage ? (
                      <span className="text-red-600 flex items-center gap-1">
                        {log.errorMessage}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">{log.details}</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default JobMonitor;
