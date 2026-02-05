/**
 * ジョブモニターコンポーネント
 * パイプラインの実行状態を監視・表示
 */
import React, { useState, useMemo } from 'react';
import { useJobMonitor, type JobStatus, type JobExecutionLog } from '../lib/JobMonitorContext';
import PipelineFlow from './PipelineFlow';
import ElapsedTimeDisplay from './common/ElapsedTimeDisplay';
import JobDetailModal from './modals/JobDetailModal';
import { CheckCircle, XCircle, Filter, Trash2, Activity, Truck, Database, RotateCw, Loader2, GitBranch, CornerDownRight, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import { STEP_KEYS } from '../lib/constants';

// ジョブタイプ定義
type JobType = 'collection' | 'delivery' | 'mapping' | 'taskflow';

const JobMonitor: React.FC = () => {
  const { logs, clearLogs, retryJob } = useJobMonitor();
  const [statusFilter, setStatusFilter] = useState<'all' | JobStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | JobType>('all');
  const [selectedLog, setSelectedLog] = useState<JobExecutionLog | null>(null);
  const [expandedFlows, setExpandedFlows] = useState<Set<string>>(new Set());
  const [showVisualizer, setShowVisualizer] = useState(true);

  // 注：毎秒の再レンダリングをElapsedTimeDisplayコンポーネントに移動
  // 親コンポーネント全体の再レンダリングが不要になり、パフォーマンスが向上

  // PipelineFlow用のアクティブステップを計算
  const activeSteps = useMemo(() => {
    return logs
      .filter(l => l.status === 'running')
      .map(l => {
        if (l.jobType === 'collection') return `${STEP_KEYS.COLLECTION_TRANSFER}_${l.jobId}`;
        if (l.jobType === 'delivery') return `${STEP_KEYS.DELIVERY_TRANSFER}_${l.jobId}`;
        if (l.jobType === 'mapping') return `${STEP_KEYS.MAPPING_TASK}_${l.jobId}`;
        if (l.jobType === 'taskflow') return `${STEP_KEYS.TASK_FLOW}_${l.jobId}`;
        return '';
      })
      .filter(Boolean);
  }, [logs]);

  const toggleFlow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFlows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const statusMatch = statusFilter === 'all' || log.status === statusFilter;
      const typeMatch = typeFilter === 'all' || (log.jobType as string) === typeFilter;
      return statusMatch && typeMatch;
    });
  }, [logs, statusFilter, typeFilter]);

  // ログをネスト構造で整理
  const organizedLogs = useMemo(() => {
    const topLevel = filteredLogs.filter(l => !l.parentLogId);
    const children = filteredLogs.filter(l => !!l.parentLogId);

    const result: { log: JobExecutionLog; isChild: boolean; isVisible: boolean }[] = [];

    topLevel.forEach(parent => {
      result.push({ log: parent, isChild: false, isVisible: true });

      const flowChildren = children.filter(c => c.parentLogId === parent.id);
      const isExpanded = expandedFlows.has(parent.id);

      flowChildren.forEach(child => {
        result.push({
          log: child,
          isChild: true,
          isVisible: isExpanded || typeFilter === 'mapping'
        });
      });
    });

    // 親がフィルタリングされた孤立した子ログを処理
    const processedChildIds = new Set(result.filter(r => r.isChild).map(r => r.log.id));
    children.forEach(child => {
      if (!processedChildIds.has(child.id)) {
        result.push({ log: child, isChild: true, isVisible: true });
      }
    });

    return result;
  }, [filteredLogs, expandedFlows, typeFilter]);

  const getTypeIcon = (type: JobType) => {
    switch (type) {
      case 'collection': return <Truck size={16} className="text-orange-600" />;
      case 'delivery': return <Truck size={16} className="text-blue-600" />;
      case 'mapping': return <Database size={16} className="text-purple-600" />;
      case 'taskflow': return <GitBranch size={16} className="text-indigo-600" />;
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <>
      <div className="h-full flex flex-col bg-white rounded shadow-sm border border-gray-200">
        {/* ヘッダー / ツールバー */}
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
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | JobStatus)}
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
                  onChange={(e) => setTypeFilter(e.target.value as 'all' | JobType)}
                  className="border border-gray-300 rounded px-2 py-1 text-gray-700 focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="collection">Collection</option>
                  <option value="delivery">Delivery</option>
                  <option value="mapping">Mapping</option>
                  <option value="taskflow">Task Flow</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowVisualizer(!showVisualizer)}
              className={`flex items-center gap-2 px-3 py-1 rounded border text-xs font-medium transition-colors ${showVisualizer ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
              title={showVisualizer ? "Hide Visualizer" : "Show Visualizer"}
            >
              {showVisualizer ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              Visualizer
            </button>
            <button
              onClick={clearLogs}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 px-3 py-1 rounded border border-gray-300 hover:border-red-300 transition-colors"
            >
              <Trash2 size={14} />
              Clear Log
            </button>
          </div>
        </div>

        {/* ビジュアライザーパネル */}
        {showVisualizer && (
          <div className="h-80 sm:h-[500px] md:h-[600px] border-b border-gray-200 bg-gray-50 overflow-hidden relative shrink-0">
            <PipelineFlow activeSteps={activeSteps} />
            <div className="absolute bottom-2 left-2 bg-white/70 backdrop-blur-sm px-2 py-1 rounded border text-[10px] text-gray-500 pointer-events-none">
              Real-time Pipeline Architecture
            </div>
          </div>
        )}

        {/* ログリスト */}
        <div className="flex-grow overflow-auto p-0 bg-gray-50/50 min-h-0">
          {/* モバイルビュー（カード） */}
          <div className="md:hidden space-y-2 p-2">
            {organizedLogs.filter(r => r.isVisible).length === 0 ? (
              <div className="p-8 text-center text-gray-400 italic">
                No execution logs found.
              </div>
            ) : (
              organizedLogs.filter(r => r.isVisible).map(({ log, isChild }) => (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className={`bg-white p-3 rounded shadow-sm border border-gray-200 space-y-2 active:bg-blue-50 transition-colors ${isChild ? 'ml-4 bg-gray-50/50' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {isChild && <CornerDownRight size={14} className="text-gray-400 shrink-0" />}
                      {log.jobType === 'taskflow' && (
                        <button onClick={(e) => toggleFlow(log.id, e)} className="p-1">
                          <ChevronRight size={14} className={`transition-transform ${expandedFlows.has(log.id) ? 'rotate-90' : ''}`} />
                        </button>
                      )}
                      {getTypeIcon(log.jobType)}
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-gray-800 text-sm truncate">
                          {log.jobName}
                          {log.jobType === 'taskflow' && (
                            <span className="ml-1 text-[10px] font-normal text-gray-400">
                              ({organizedLogs.filter(r => r.log.parentLogId === log.id).length})
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-gray-500 uppercase">{log.jobType}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0 ml-2">
                      <span className="text-xs text-gray-500 font-mono">{formatTime(log.startTime)}</span>
                      <ElapsedTimeDisplay
                        startTime={log.startTime}
                        endTime={log.endTime}
                        className="text-[10px] text-gray-400 font-mono"
                      />
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

          {/* デスクトップビュー（テーブル） */}
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
              {organizedLogs.filter(r => r.isVisible).length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400 italic">
                    No execution logs found.
                  </td>
                </tr>
              ) : (
                organizedLogs.filter(r => r.isVisible).map(({ log, isChild }) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`hover:bg-blue-50 transition-colors cursor-pointer group ${isChild ? 'bg-gray-50/50' : ''}`}
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
                      <div className="flex items-center gap-2">
                        {isChild && <CornerDownRight size={14} className="text-gray-400 shrink-0 ml-4" />}
                        {log.jobType === 'taskflow' && (
                          <button
                            onClick={(e) => toggleFlow(log.id, e)}
                            className="p-0.5 hover:bg-gray-200 rounded transition-colors text-gray-500"
                          >
                            <ChevronRight
                              size={14}
                              className={`transition-transform ${expandedFlows.has(log.id) ? 'rotate-90' : ''}`}
                            />
                          </button>
                        )}
                        <span className="truncate">
                          {log.jobName}
                          {log.jobType === 'taskflow' && (
                            <span className="ml-1 text-[10px] font-normal text-gray-400">
                              ({organizedLogs.filter(r => r.log.parentLogId === log.id).length} tasks)
                            </span>
                          )}
                        </span>
                      </div>
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
                      <ElapsedTimeDisplay
                        startTime={log.startTime}
                        endTime={log.endTime}
                      />
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
