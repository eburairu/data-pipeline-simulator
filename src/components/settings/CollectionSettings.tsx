import React, { useState } from 'react';
import { useSettings, type CollectionJob } from '../../lib/SettingsContext';
import { validateCollectionJob } from '../../lib/validation';
import { Trash2, Plus, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import type { LoadMode, RetryConfig, CollectionTriggerType, ScheduleType } from '../../lib/types';

const CollectionSettings: React.FC = () => {
  const { collection, setCollection, topics, connections, hosts } = useSettings();
  const [expandedAdvanced, setExpandedAdvanced] = useState<Record<string, boolean>>({});

  const toggleAdvanced = (jobId: string) => {
    setExpandedAdvanced(prev => ({ ...prev, [jobId]: !prev[jobId] }));
  };

  const handleJobChange = (id: string, field: keyof CollectionJob, value: any) => {
    const newJobs = collection.jobs.map(job =>
      job.id === id ? { ...job, [field]: value } : job
    );
    setCollection({ ...collection, jobs: newJobs });
  };

  const handleSourceConnectionChange = (id: string, connectionId: string) => {
    const newConn = connections.find(c => c.id === connectionId);
    const newHost = newConn ? hosts.find(h => h.name === newConn.host) : null;
    const defaultPath = newHost && newHost.directories.length > 0 ? newHost.directories[0] : '/';

    const newJobs = collection.jobs.map(job =>
      job.id === id ? { ...job, sourceConnectionId: connectionId, sourcePath: defaultPath } : job
    );
    setCollection({ ...collection, jobs: newJobs });
  };

  const handleTargetConnectionChange = (id: string, connectionId: string) => {
    const newConn = connections.find(c => c.id === connectionId);
    const newHost = newConn ? hosts.find(h => h.name === newConn.host) : null;
    const defaultPath = newHost && newHost.directories.length > 0 ? newHost.directories[0] : '/';

    const newJobs = collection.jobs.map(job =>
      job.id === id ? { ...job, targetConnectionId: connectionId, targetPath: defaultPath } : job
    );
    setCollection({ ...collection, jobs: newJobs });
  };

  const handleTargetTypeChange = (id: string, type: 'host' | 'topic') => {
    const newJobs = collection.jobs.map(job => {
      if (job.id !== id) return job;

      if (type === 'host') {
        const defaultConn = connections.find(c => c.type === 'file');
        const defaultHost = defaultConn ? hosts.find(h => h.name === defaultConn.host) : null;
        const defaultPath = defaultHost && defaultHost.directories.length > 0 ? defaultHost.directories[0] : '/';
        return {
          ...job,
          targetType: type,
          targetConnectionId: job.targetConnectionId || defaultConn?.id || '',
          targetPath: defaultPath,
          targetTopicId: undefined // clear topic
        };
      } else {
        return {
          ...job,
          targetType: type,
          targetConnectionId: undefined, // clear conn
          targetTopicId: job.targetTopicId || (topics.length > 0 ? topics[0].id : '')
        };
      }
    });
    setCollection({ ...collection, jobs: newJobs });
  };

  const addJob = () => {
    const fileConns = connections.filter(c => c.type === 'file');
    const defaultConn = fileConns.length > 0 ? fileConns[0] : undefined;
    const secondConn = fileConns.length > 1 ? fileConns[1] : defaultConn;

    // ソースコネクションのデフォルトパスを取得
    const sourceHost = defaultConn ? hosts.find(h => h.name === defaultConn.host) : null;
    const sourcePath = sourceHost && sourceHost.directories.length > 0 ? sourceHost.directories[0] : '/';

    // ターゲットコネクションのデフォルトパスを取得
    const targetHost = (secondConn || defaultConn) ? hosts.find(h => h.name === (secondConn || defaultConn)!.host) : null;
    const targetPath = targetHost && targetHost.directories.length > 0 ? targetHost.directories[0] : '/';

    const newJob: CollectionJob = {
      id: `job_${Date.now()}`,
      name: `Job ${collection.jobs.length + 1}`,
      sourceConnectionId: defaultConn?.id || '',
      sourcePath: sourcePath,
      filterRegex: '.*',
      targetType: 'host',
      targetConnectionId: secondConn?.id || defaultConn?.id || '',
      targetPath: targetPath,
      bandwidth: 100,
      renamePattern: '${fileName}',
      executionInterval: 1000,
      enabled: true,
    };
    setCollection({ ...collection, jobs: [...collection.jobs, newJob] });
  };

  const removeJob = (id: string) => {
    setCollection({ ...collection, jobs: collection.jobs.filter(j => j.id !== id) });
  };

  const handleProcessingTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCollection({ ...collection, processingTime: parseInt(e.target.value) || 0 });
  }

  const fileConnections = connections.filter(c => c.type === 'file');

  return (
    <div className="space-y-4 p-4 border rounded bg-white shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Publications (Collection)</h3>

      {/* Global Settings */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Base Processing Time (Latency) (ms)</label>
        <input
          type="number"
          value={collection.processingTime}
          onChange={handleProcessingTimeChange}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 ${collection.processingTime < 0 ? 'border-red-500 bg-red-50' : ''}`}
          title={collection.processingTime < 0 ? "Cannot be negative" : ""}
        />
      </div>

      <div className="space-y-4">
        {collection.jobs.map((job) => {
          const errors = validateCollectionJob(job);
          const hasError = (field: string) => errors.some(e => e.field === field);
          const getErrorMsg = (field: string) => errors.find(e => e.field === field)?.message;

          const sourceConn = connections.find(c => c.id === job.sourceConnectionId);
          const sourceHost = sourceConn ? hosts.find(h => h.name === sourceConn.host) : null;

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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Source Connection</label>
                    <select
                      value={job.sourceConnectionId}
                      onChange={(e) => handleSourceConnectionChange(job.id, e.target.value)}
                      className={`w-full border rounded p-1 text-sm bg-white ${hasError('sourceConnectionId') ? 'border-red-500 bg-red-50' : ''}`}
                      title={getErrorMsg('sourceConnectionId')}
                    >
                      <option value="">Select Connection</option>
                      {fileConnections.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.host})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Source Path</label>
                    <select
                      value={job.sourcePath}
                      onChange={(e) => handleJobChange(job.id, 'sourcePath', e.target.value)}
                      className={`w-full border rounded p-1 text-sm bg-white ${hasError('sourcePath') ? 'border-red-500 bg-red-50' : ''}`}
                      title={getErrorMsg('sourcePath')}
                      disabled={!job.sourceConnectionId}
                    >
                      <option value="">Select Path...</option>
                      {sourceHost?.directories.map(dir => (
                        <option key={dir} value={dir}>{dir}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Target Config */}
                <div className="border-t pt-2 mt-2 bg-gray-100 p-2 rounded">
                  <label className="block text-xs font-bold text-gray-700 mb-2">Target Destination</label>
                  <div className="flex gap-4 mb-2">
                    <label className="flex items-center text-xs cursor-pointer">
                      <input
                        type="radio"
                        checked={job.targetType !== 'topic'}
                        onChange={() => handleTargetTypeChange(job.id, 'host')}
                        className="mr-1"
                      /> Connection (File)
                    </label>
                    <label className="flex items-center text-xs cursor-pointer">
                      <input
                        type="radio"
                        checked={job.targetType === 'topic'}
                        onChange={() => handleTargetTypeChange(job.id, 'topic')}
                        className="mr-1"
                      /> Topic
                    </label>
                  </div>

                  {job.targetType === 'topic' ? (
                    <div>
                      <label className="block text-xs font-medium text-gray-500">Target Topic</label>
                      <select
                        value={job.targetTopicId || ''}
                        onChange={(e) => handleJobChange(job.id, 'targetTopicId', e.target.value)}
                        className={`w-full border rounded p-1 text-sm bg-white ${hasError('targetTopicId') ? 'border-red-500 bg-red-50' : ''}`}
                        title={getErrorMsg('targetTopicId')}
                      >
                        <option value="">Select Topic</option>
                        {topics.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      <div className="mt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={job.triggerSubscriptions || false}
                            onChange={(e) => handleJobChange(job.id, 'triggerSubscriptions', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xs text-gray-700">Trigger Subscriptions Immediately (Real-time)</span>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500">Target Connection</label>
                        <select
                          value={job.targetConnectionId || ''}
                          onChange={(e) => handleTargetConnectionChange(job.id, e.target.value)}
                          className={`w-full border rounded p-1 text-sm bg-white ${hasError('targetConnectionId') ? 'border-red-500 bg-red-50' : ''}`}
                          title={getErrorMsg('targetConnectionId')}
                        >
                          <option value="">Select Connection</option>
                          {fileConnections.map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.host})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500">Target Path</label>
                        {(() => {
                          const targetConn = connections.find(c => c.id === job.targetConnectionId);
                          const targetHost = targetConn ? hosts.find(h => h.name === targetConn.host) : null;
                          return (
                            <select
                              value={job.targetPath || ''}
                              onChange={(e) => handleJobChange(job.id, 'targetPath', e.target.value)}
                              className={`w-full border rounded p-1 text-sm bg-white ${hasError('targetPath') ? 'border-red-500 bg-red-50' : ''}`}
                              title={getErrorMsg('targetPath')}
                              disabled={!job.targetConnectionId}
                            >
                              <option value="">Select Path...</option>
                              {targetHost?.directories.map(dir => (
                                <option key={dir} value={dir}>{dir}</option>
                              ))}
                            </select>
                          );
                        })()}
                      </div>
                    </div>
                  )}
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
                <div>
                  <label className="block text-xs font-medium text-gray-500">Rename Pattern (Vars: {'${fileName}'}, {'${collectionHost}'}, {'${timestamp}'})</label>
                  <input
                    type="text"
                    value={job.renamePattern || '${fileName}'}
                    onChange={(e) => handleJobChange(job.id, 'renamePattern', e.target.value)}
                    className="w-full border rounded p-1 text-sm"
                  />
                </div>
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={job.deleteSourceAfterTransfer !== false}
                      onChange={(e) => handleJobChange(job.id, 'deleteSourceAfterTransfer', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-gray-700">
                      Delete source file after transfer
                      <span className="text-gray-400 ml-1">(uncheck to copy instead of move)</span>
                    </span>
                  </label>
                </div>

                {/* Advanced Settings */}
                <div className="mt-3 pt-3 border-t border-gray-300">
                  <button
                    onClick={() => toggleAdvanced(job.id)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                  >
                    {expandedAdvanced[job.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    高度な設定 (増分処理・リトライ)
                  </button>

                  {expandedAdvanced[job.id] && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded space-y-3">
                      {/* Load Mode */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Load Mode</label>
                        <select
                          value={job.loadMode || 'full'}
                          onChange={(e) => handleJobChange(job.id, 'loadMode', e.target.value as LoadMode)}
                          className="w-full border rounded p-1 text-sm bg-white"
                        >
                          <option value="full">Full (全量処理)</option>
                          <option value="incremental">Incremental (増分処理)</option>
                          <option value="initial_and_incremental">Initial + Incremental (初回全量+増分)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          {job.loadMode === 'full' && '毎回すべてのファイルを処理'}
                          {job.loadMode === 'incremental' && '前回処理以降の新規ファイルのみを処理'}
                          {job.loadMode === 'initial_and_incremental' && '初回は全量、2回目以降は増分処理'}
                          {!job.loadMode && '毎回すべてのファイルを処理'}
                        </p>
                      </div>

                      {/* Retry Config */}
                      <div className="border-t border-blue-300 pt-2">
                        <label className="block text-xs font-bold text-gray-700 mb-2">Retry Configuration</label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-600">Max Retries</label>
                            <input
                              type="number"
                              value={job.retryConfig?.maxRetries ?? 0}
                              onChange={(e) => handleJobChange(job.id, 'retryConfig', {
                                ...job.retryConfig,
                                maxRetries: parseInt(e.target.value) || 0
                              } as RetryConfig)}
                              className="w-full border rounded p-1 text-sm"
                              min="0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600">Retry Delay (ms)</label>
                            <input
                              type="number"
                              value={job.retryConfig?.retryDelayMs ?? 1000}
                              onChange={(e) => handleJobChange(job.id, 'retryConfig', {
                                ...job.retryConfig,
                                retryDelayMs: parseInt(e.target.value) || 1000
                              } as RetryConfig)}
                              className="w-full border rounded p-1 text-sm"
                              min="0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600">Backoff Multiplier</label>
                            <input
                              type="number"
                              value={job.retryConfig?.backoffMultiplier ?? 2}
                              onChange={(e) => handleJobChange(job.id, 'retryConfig', {
                                ...job.retryConfig,
                                backoffMultiplier: parseFloat(e.target.value) || 2
                              } as RetryConfig)}
                              className="w-full border rounded p-1 text-sm"
                              min="1"
                              step="0.1"
                            />
                          </div>
                          <div className="flex items-end">
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={job.retryConfig?.continueOnError ?? false}
                                onChange={(e) => handleJobChange(job.id, 'retryConfig', {
                                  ...job.retryConfig,
                                  continueOnError: e.target.checked
                                } as RetryConfig)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-xs text-gray-700">Continue on Error</span>
                            </label>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          エラー発生時に最大 {job.retryConfig?.maxRetries ?? 0} 回リトライ。
                          {(job.retryConfig?.backoffMultiplier ?? 2) > 1 && ` 待機時間は指数的に増加 (×${job.retryConfig?.backoffMultiplier ?? 2})。`}
                        </p>
                      </div>

                      {/* Phase 2-4: 追加機能（未実装） */}
                      <div className="border-t border-blue-300 pt-2">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle size={14} className="text-orange-500" />
                          <label className="text-xs font-bold text-gray-700">Phase 2-4: 追加機能 (型定義のみ・未実装)</label>
                        </div>

                        {/* Phase 2: Trigger Type */}
                        <div className="mb-2">
                          <label className="block text-xs font-medium text-gray-600">Trigger Type (Phase 2)</label>
                          <select
                            value={job.triggerType || 'polling'}
                            onChange={(e) => handleJobChange(job.id, 'triggerType', e.target.value as CollectionTriggerType)}
                            className="w-full border rounded p-1 text-sm bg-white"
                            disabled
                          >
                            <option value="polling">Polling (実装済み)</option>
                            <option value="file_listener">File Listener (未実装)</option>
                          </select>
                        </div>

                        {/* Phase 3: Schedule Type */}
                        <div className="mb-2">
                          <label className="block text-xs font-medium text-gray-600">Schedule Type (Phase 3)</label>
                          <select
                            value={job.scheduleType || 'interval'}
                            onChange={(e) => handleJobChange(job.id, 'scheduleType', e.target.value as ScheduleType)}
                            className="w-full border rounded p-1 text-sm bg-white"
                            disabled
                          >
                            <option value="interval">Interval (実装済み)</option>
                            <option value="cron">Cron Schedule (未実装)</option>
                            <option value="manual">Manual (未実装)</option>
                          </select>
                        </div>

                        {/* Phase 4: Parallel Batch Size */}
                        <div className="mb-2">
                          <label className="block text-xs font-medium text-gray-600">Parallel Batch Size (Phase 4)</label>
                          <input
                            type="number"
                            value={job.parallelBatchSize ?? 1}
                            onChange={(e) => handleJobChange(job.id, 'parallelBatchSize', parseInt(e.target.value) || 1)}
                            className="w-full border rounded p-1 text-sm"
                            min="1"
                            disabled
                          />
                        </div>

                        <p className="text-xs text-orange-600 mt-2">
                          ⚠️ Phase 2-4の機能は型定義のみ追加されており、実際のロジックは未実装です。
                        </p>
                      </div>
                    </div>
                  )}
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

export default CollectionSettings;
