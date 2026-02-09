/**
 * ジョブモニターコンポーネント
 * パイプラインの実行状態を監視・表示
 */
import React, { useState, useMemo } from 'react';
import { useJobMonitor, type JobStatus, type JobExecutionLog, type JobType } from '../lib/JobMonitorContext';
import PipelineFlow from './PipelineFlow';
import ElapsedTimeDisplay from './common/ElapsedTimeDisplay';
import StatusBadge from './common/StatusBadge';
import JobDetailModal from './modals/JobDetailModal';
import { Filter, Trash2, Activity, Truck, Database, RotateCw, GitBranch, CornerDownRight, ChevronRight, Maximize2, Minimize2, Archive } from 'lucide-react';
import { STEP_KEYS } from '../lib/constants';

// ジョブタイプ定義は JobMonitorContext からインポートするように変更

const JobMonitor: React.FC = () => {
  const { logs, clearLogs, retryJob } = useJobMonitor();
  const [statusFilter, setStatusFilter] = useState<'all' | JobStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | JobType>('all');
  const [selectedLog, setSelectedLog] = useState<JobExecutionLog | null>(null);
  const [expandedFlows, setExpandedFlows] = useState<Set<string>>(new Set());
  const [showVisualizer, setShowVisualizer] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // フィルタ変更時にページをリセット
  React.useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, typeFilter]);

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
        if (l.jobType === 'archive') return `${STEP_KEYS.ARCHIVE_JOB}_${l.jobId}`;
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

  // ログをネスト構造で整理し、ページネーションを適用
  const { paginatedLogs, totalPages, totalItems } = useMemo(() => {
    const topLevel = filteredLogs.filter(l => !l.parentLogId);
    const children = filteredLogs.filter(l => !!l.parentLogId);
    
    const total = topLevel.length;
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const slicedTopLevel = topLevel.slice(start, end);

    const result: { log: JobExecutionLog; isChild: boolean; isVisible: boolean }[] = [];

    slicedTopLevel.forEach(parent => {
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

    // 親がフィルタリングされた、または現在のページに含まれない孤立した子ログを処理（デバッグ等で重要）
    // ただし基本的にはページネーションは親単位で行うため、ここでの処理は補完的
    if (currentPage === 1) {
        const processedChildIds = new Set(result.filter(r => r.isChild).map(r => r.log.id));
        children.forEach(child => {
          if (!processedChildIds.has(child.id) && !topLevel.find(p => p.id === child.parentLogId)) {
            result.push({ log: child, isChild: true, isVisible: true });
          }
        });
    }

    return {
        paginatedLogs: result,
        totalPages: Math.max(1, Math.ceil(total / itemsPerPage)),
        totalItems: total
    };
  }, [filteredLogs, expandedFlows, typeFilter, currentPage, itemsPerPage]);

  const getTypeIcon = (type: JobType) => {
    switch (type) {
      case 'collection': return <Truck size={16} className="text-orange-600" />;
      case 'delivery': return <Truck size={16} className="text-blue-600" />;
      case 'mapping': return <Database size={16} className="text-purple-600" />;
      case 'taskflow': return <GitBranch size={16} className="text-indigo-600" />;
      case 'archive': return <Archive size={16} className="text-amber-600" />;
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <>
      <div className="h-full flex flex-col bg-white rounded shadow-sm border border-gray-200">
        {/* ヘッダー / ツールバー */}
        <div className="p-2 px-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t">
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
                  className="border border-gray-300 rounded px-2 py-0.5 text-gray-700 focus:outline-none focus:border-blue-500 text-xs"
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
                  className="border border-gray-300 rounded px-2 py-0.5 text-gray-700 focus:outline-none focus:border-blue-500 text-xs"
                >
                  <option value="all">All Types</option>
                  <option value="collection">Collection</option>
                  <option value="delivery">Delivery</option>
                  <option value="mapping">Mapping</option>
                  <option value="taskflow">Task Flow</option>
                  <option value="archive">Archive</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowVisualizer(!showVisualizer)}
              className={`flex items-center gap-2 px-3 py-1 rounded border text-xs font-medium transition-colors ${showVisualizer ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
              title={showVisualizer ? "Hide Visualizer" : "Show Visualizer"}
              aria-pressed={showVisualizer}
            >
              {showVisualizer ? <Minimize2 size={14} aria-hidden="true" /> : <Maximize2 size={14} aria-hidden="true" />}
              Visualizer
            </button>
            <button
              onClick={clearLogs}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 px-3 py-1 rounded border border-gray-300 hover:border-red-300 transition-colors"
            >
              <Trash2 size={14} aria-hidden="true" />
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
          <div className="md:hidden space-y-1.5 p-2">
            {paginatedLogs.filter(r => r.isVisible).length === 0 ? (
              <div className="p-8 text-center text-gray-400 italic">
                No execution logs found.
              </div>
            ) : (
              paginatedLogs.filter(r => r.isVisible).map(({ log, isChild }) => (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedLog(log); } }}
                  role="button"
                  tabIndex={0}
                  className={`bg-white p-2 rounded shadow-sm border border-gray-200 space-y-1.5 active:bg-blue-50 transition-colors ${isChild ? 'ml-4 bg-gray-50/50' : ''}`}
                  aria-label={`${log.jobName} - ${log.status}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {isChild && <CornerDownRight size={14} className="text-gray-400 shrink-0" />}
                      {log.jobType === 'taskflow' && (
                        <button onClick={(e) => toggleFlow(log.id, e)} className="p-1" aria-label={expandedFlows.has(log.id) ? 'タスクフローを折りたたむ' : 'タスクフローを展開'} aria-expanded={expandedFlows.has(log.id)}>
                          <ChevronRight size={14} className={`transition-transform ${expandedFlows.has(log.id) ? 'rotate-90' : ''}`} aria-hidden="true" />
                        </button>
                      )}
                      {getTypeIcon(log.jobType)}
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-gray-800 text-sm truncate">
                          {log.jobName}
                          {log.jobType === 'taskflow' && (
                            <span className="ml-1 text-[10px] font-normal text-gray-400">
                              ({filteredLogs.filter(r => r.parentLogId === log.id).length})
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
                      <StatusBadge status={log.status} />
                    </div>
                    <div className="font-mono text-[10px] text-gray-600">
                      <span className="text-gray-500">In:</span> {log.recordsInput} <span className="text-gray-300">|</span> <span className="text-gray-500">Out:</span> {log.recordsOutput}
                    </div>
                  </div>

                  {log.errorMessage && (
                    <div className="text-[10px] text-red-600 bg-red-50 p-1 rounded border border-red-100 truncate">
                      {log.errorMessage}
                    </div>
                  )}

                  <div className="pt-1.5 border-t border-gray-100 flex justify-end" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => retryJob(log.jobId, log.jobType)}
                      className="flex items-center gap-1 text-[10px] font-medium text-blue-600 hover:text-blue-800 px-2 py-0.5 rounded hover:bg-blue-50 transition-colors"
                    >
                      <RotateCw size={12} /> Retry Job
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
                <th className="p-1.5 font-semibold w-24">Time</th>
                <th className="p-1.5 font-semibold w-32">Type</th>
                <th className="p-1.5 font-semibold w-48">Job Name</th>
                <th className="p-1.5 font-semibold w-24">Status</th>
                <th className="p-1.5 font-semibold w-32 text-right">Duration</th>
                <th className="p-1.5 font-semibold w-32 text-right">Records (In/Out)</th>
                <th className="p-1.5 font-semibold">Details / Message</th>
                <th className="p-1.5 font-semibold w-16 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedLogs.filter(r => r.isVisible).length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400 italic">
                    No execution logs found.
                  </td>
                </tr>
              ) : (
                paginatedLogs.filter(r => r.isVisible).map(({ log, isChild }) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedLog(log); } }}
                    tabIndex={0}
                    className={`hover:bg-blue-50 transition-colors cursor-pointer group ${isChild ? 'bg-gray-50/50' : ''}`}
                    aria-label={`${log.jobName} - ${log.status}`}
                  >
                    <td className="p-1.5 text-gray-500 whitespace-nowrap font-mono text-[10px]">
                      {formatTime(log.startTime)}
                    </td>
                    <td className="p-1.5">
                      <div className="flex items-center gap-1.5">
                        {getTypeIcon(log.jobType)}
                        <span className="capitalize text-xs">{log.jobType}</span>
                      </div>
                    </td>
                    <td className="p-1.5 font-medium text-gray-700 truncate max-w-[200px]" title={log.jobName}>
                      <div className="flex items-center gap-1.5">
                        {isChild && <CornerDownRight size={12} className="text-gray-400 shrink-0 ml-4" />}
                        {log.jobType === 'taskflow' && (
                          <button
                            onClick={(e) => toggleFlow(log.id, e)}
                            className="p-0.5 hover:bg-gray-200 rounded transition-colors text-gray-500"
                            aria-label={expandedFlows.has(log.id) ? 'タスクフローを折りたたむ' : 'タスクフローを展開'}
                            aria-expanded={expandedFlows.has(log.id)}
                          >
                            <ChevronRight
                              size={12}
                              className={`transition-transform ${expandedFlows.has(log.id) ? 'rotate-90' : ''}`}
                              aria-hidden="true"
                            />
                          </button>
                        )}
                        <span className="truncate text-xs">
                          {log.jobName}
                          {log.jobType === 'taskflow' && (
                            <span className="ml-1 text-[10px] font-normal text-gray-400">
                              ({filteredLogs.filter(r => r.parentLogId === log.id).length} tasks)
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="p-1.5">
                      <StatusBadge status={log.status} className="text-[10px]" />
                    </td>
                    <td className="p-1.5 text-right text-gray-500 font-mono text-[10px]">
                      <ElapsedTimeDisplay
                        startTime={log.startTime}
                        endTime={log.endTime}
                      />
                    </td>
                    <td className="p-1.5 text-right font-mono text-[10px]">
                      <span className="text-gray-600">{log.recordsInput}</span>
                      <span className="text-gray-300 mx-1">/</span>
                      <span className="text-gray-900 font-semibold">{log.recordsOutput}</span>
                    </td>
                    <td className="p-1.5 text-gray-600 truncate max-w-[300px]" title={log.errorMessage || log.details}>
                      <div className="flex justify-between items-center gap-2">
                        {log.errorMessage ? (
                          <span className="text-red-600 flex items-center gap-1 truncate text-xs">
                            {log.errorMessage}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[10px] truncate">{log.details}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-1.5 text-center" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => retryJob(log.jobId, log.jobType)}
                        className="text-gray-400 hover:text-blue-600 transition-colors p-1 rounded hover:bg-blue-100"
                        title="Retry Job"
                        aria-label={`${log.jobName} を再実行`}
                      >
                        <RotateCw size={14} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ページネーションフッター */}
        <div className="p-2 border-t border-gray-200 bg-gray-50 flex flex-wrap justify-between items-center gap-2 text-xs text-gray-600">
          <div className="flex items-center gap-4">
            <span className="font-medium">
              Total: <span className="text-gray-900">{totalItems}</span> jobs
            </span>
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                }}
                className="border border-gray-300 rounded px-1 py-0.5 bg-white"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            <div className="flex items-center px-2">
              <span className="font-semibold text-blue-600">{currentPage}</span>
              <span className="mx-1 text-gray-400">/</span>
              <span>{totalPages}</span>
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {selectedLog && (
        <JobDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </>
  );
};

export default JobMonitor;
