/**
 * ジョブ詳細モーダルコンポーネント
 * ジョブの実行結果、統計情報、エラー詳細を表示
 */
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { type JobStatus, type JobExecutionLog, type MappingExecutionDetails, type TransferExecutionDetails } from '../../lib/JobMonitorContext';
import { useSettings } from '../../lib/SettingsContext';
import MappingDesigner from '../settings/MappingDesigner';
import { CheckCircle, XCircle, X, Info, AlertTriangle, Loader2, Workflow, Truck, Database, GitBranch, Activity } from 'lucide-react';
import { UI } from '../../lib/constants';

// ジョブタイプ定義
type JobType = 'collection' | 'delivery' | 'mapping' | 'taskflow';

export interface JobDetailModalProps {
  /** 表示するジョブログ */
  log: JobExecutionLog;
  /** モーダルを閉じる際のコールバック */
  onClose: () => void;
}

/**
 * ジョブタイプに応じたアイコンを返す
 */
const getTypeIcon = (type: JobType) => {
  switch (type) {
    case 'collection': return <Truck size={20} className="text-orange-600" />;
    case 'delivery': return <Truck size={20} className="text-blue-600" />;
    case 'mapping': return <Database size={20} className="text-purple-600" />;
    case 'taskflow': return <GitBranch size={20} className="text-indigo-600" />;
  }
};

/**
 * ステータスバッジを返す
 */
const getStatusBadge = (status: JobStatus) => {
  switch (status) {
    case 'success': return <span className="font-bold flex items-center gap-1 text-green-600"><CheckCircle size={14} /> SUCCESS</span>;
    case 'failed': return <span className="font-bold flex items-center gap-1 text-red-600"><XCircle size={14} /> FAILED</span>;
    case 'running': return <span className="font-bold flex items-center gap-1 text-blue-600"><Loader2 size={14} className="animate-spin" /> RUNNING</span>;
  }
};

/**
 * ジョブ詳細モーダル
 */
const JobDetailModal: React.FC<JobDetailModalProps> = ({ log, onClose }) => {
  const isMapping = log.jobType === 'mapping';
  const isTransfer = log.jobType === 'collection' || log.jobType === 'delivery';
  const [showVisual, setShowVisual] = useState(false);
  const [showAllRejects, setShowAllRejects] = useState(false);
  const [showAllTransformations, setShowAllTransformations] = useState(false);
  const { mappingTasks } = useSettings();

  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const mappingDetails = isMapping ? (log.extendedDetails as MappingExecutionDetails) : null;
  const transferDetails = isTransfer ? (log.extendedDetails as TransferExecutionDetails) : null;

  // フォーカストラップとEscキー対応
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key === 'Tab' && modalRef.current) {
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  }, [onClose]);

  // モーダル表示時にフォーカスを移動、閉じる時に復元
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    const firstButton = modalRef.current?.querySelector<HTMLElement>('button');
    firstButton?.focus();
    return () => {
      previousFocusRef.current?.focus();
    };
  }, []);

  // マッピングジョブの場合、マッピングIDを解決
  const mappingId = useMemo(() => {
    if (!isMapping) return null;
    const task = mappingTasks.find(t => t.id === log.jobId);
    return task ? task.mappingId : null;
  }, [isMapping, log.jobId, mappingTasks]);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-detail-title"
      onKeyDown={handleKeyDown}
      ref={modalRef}
    >
      <div className={`bg-white rounded-lg shadow-xl w-full ${showVisual ? 'max-w-6xl h-[85vh]' : 'max-w-4xl max-h-[90vh]'} flex flex-col animate-in fade-in zoom-in duration-200 transition-all`} onClick={e => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className="flex justify-between items-center p-4 border-b bg-gray-50 rounded-t-lg shrink-0">
          <div className="flex items-center gap-3">
            {getTypeIcon(log.jobType)}
            <div>
              <h3 id="job-detail-title" className="font-bold text-lg text-gray-800 leading-tight">{log.jobName}</h3>
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
            <button onClick={onClose} className="p-2 rounded hover:bg-gray-200 text-gray-500 transition-colors" aria-label="モーダルを閉じる"><X size={20} aria-hidden="true" /></button>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="flex-grow overflow-y-auto p-6 space-y-6">
          {showVisual && isMapping && mappingDetails ? (
            <div className="h-full min-h-[500px] border rounded shadow-inner bg-gray-100">
              <MappingDesigner
                readOnly={true}
                initialMappingId={mappingId || undefined}
                executionStats={mappingDetails}
              />
            </div>
          ) : (
            <>
              {/* サマリーグリッド */}
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

              {/* エラーメッセージ */}
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

              {/* 詳細テキスト */}
              {log.details && (
                <div className="text-sm text-gray-600 bg-blue-50/50 p-3 rounded border border-blue-100 flex gap-2">
                  <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
                  <span>{log.details}</span>
                </div>
              )}

              {/* マッピング変換統計 */}
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
                        {(() => {
                          const entries = Object.entries(mappingDetails.transformations);
                          const displayEntries = showAllTransformations ? entries : entries.slice(0, UI.INITIAL_DISPLAY_LIMIT);
                          return (
                            <>
                              {displayEntries.map(([id, stats]) => (
                                <tr key={id} className={`transition-colors ${stats.errors > 0 ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                                  <td className="p-3 font-medium text-gray-800">{stats.name || id}</td>
                                  <td className="p-3 text-right font-mono text-gray-600">{stats.input}</td>
                                  <td className="p-3 text-right font-mono text-gray-600">{stats.output}</td>
                                  <td className={`p-3 text-right font-mono ${stats.errors > 0 ? 'text-red-700 font-bold' : 'text-gray-300'}`}>{stats.errors}</td>
                                  <td className={`p-3 text-right font-mono ${stats.rejects > 0 ? 'text-orange-600 font-bold' : 'text-gray-300'}`}>{stats.rejects}</td>
                                </tr>
                              ))}
                              {entries.length > UI.INITIAL_DISPLAY_LIMIT && (
                                <tr>
                                  <td colSpan={5} className="p-2 text-center">
                                    <button
                                      onClick={() => setShowAllTransformations(!showAllTransformations)}
                                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                      {showAllTransformations ? `Show less` : `Show all ${entries.length} transformations`}
                                    </button>
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 転送メトリクス */}
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

              {/* リジェクト行詳細 */}
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
                        {(() => {
                          const rejectRows = mappingDetails.rejectRows;
                          const displayRows = showAllRejects ? rejectRows : rejectRows.slice(0, UI.INITIAL_DISPLAY_LIMIT);
                          return (
                            <>
                              {displayRows.map((r, i) => (
                                <tr key={i}>
                                  <td className="p-2 text-orange-400 align-top">{r.transformationName}</td>
                                  <td className="p-2 text-red-400 align-top">{r.error}</td>
                                  <td className="p-2 text-gray-300 whitespace-pre-wrap">{JSON.stringify(r.row, null, 2)}</td>
                                </tr>
                              ))}
                              {rejectRows.length > UI.INITIAL_DISPLAY_LIMIT && (
                                <tr>
                                  <td colSpan={3} className="p-2 text-center">
                                    <button
                                      onClick={() => setShowAllRejects(!showAllRejects)}
                                      className="text-sm text-blue-400 hover:text-blue-300 font-medium"
                                    >
                                      {showAllRejects ? `Show less` : `Show all ${rejectRows.length} rejected rows`}
                                    </button>
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* フッター */}
        <div className="p-4 border-t bg-gray-50 rounded-b-lg flex justify-end">
          <button onClick={onClose} className="px-5 py-2 bg-white border border-gray-300 rounded shadow-sm text-sm font-medium hover:bg-gray-50 text-gray-700 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobDetailModal;
