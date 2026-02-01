import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FileSystemProvider, useFileSystem, type VFile } from './lib/VirtualFileSystem';
import { VirtualDBProvider, useVirtualDB } from './lib/VirtualDB';
import { SettingsProvider, useSettings } from './lib/SettingsContext';
import { LanguageProvider } from './lib/i18n/LanguageContext';
import { JobMonitorProvider, useJobMonitor, type JobType } from './lib/JobMonitorContext';
import PipelineFlow from './components/PipelineFlow';
import BiDashboard from './components/BiDashboard';
import SettingsPanel from './components/settings/SettingsPanel';
import JobMonitor from './components/JobMonitor';
import { processTemplate } from './lib/templateUtils';
import { generateDataFromSchema } from './lib/DataGenerator';
import { executeMappingTaskRecursive, type ExecutionState, type ExecutionStats } from './lib/MappingEngine';
import 'reactflow/dist/style.css';
import { Settings, Play, Pause, Activity, FilePlus, AlertTriangle, List, Grid3X3, MonitorPlay, Book } from 'lucide-react';
import Documentation from './components/Documentation';
import { useTranslation } from './lib/i18n/LanguageContext';
import { Globe } from 'lucide-react';

// eslint-disable-next-line react-refresh/only-export-components
const StorageView = React.memo(({ name, host, path, type, files }: { name?: string, host: string, path: string, type: string, files: VFile[] }) => {
  const colorClass = type === 'source' ? 'text-green-600' :
    type === 'topic' ? 'text-purple-600' :
      type === 'incoming' ? 'text-orange-600' : 'text-blue-600';

  const displayPath = type === 'topic' ? '(Topic)' : `${host}:${path}`;
  const title = name ? name : displayPath;

  return (
    <div className="text-xs border border-gray-200 p-2 rounded bg-white shadow-sm h-full flex flex-col">
      <div className="font-semibold text-gray-700 mb-1 flex justify-between items-center" title={`${host}:${path}`}>
        <span className="truncate mr-2">{title}</span>
        {name && <span className="text-gray-400 font-normal text-[10px] truncate max-w-[50%]">{displayPath}</span>}
      </div>
      <ul className="space-y-1 h-24 overflow-y-auto bg-gray-50 p-1 rounded-sm border border-gray-100 flex-grow">
        {files.map(f => (
          <li key={f.name} className={`${colorClass} truncate text-[11px] font-mono`}>{f.name}</li>
        ))}
        {files.length === 0 && <span className="text-gray-400 italic text-[10px] pl-1">Empty</span>}
      </ul>
    </div>
  );
});

const calculateProcessingTime = (content: string, bandwidth: number, latency: number) => {
  const safeBandwidth = Math.max(0.1, bandwidth);
  const transferTime = (content.length / safeBandwidth) * 1000;
  return transferTime + latency;
};

// Wrapper to handle the cyclic dependency between Logic and Logger
const SimulationManager: React.FC<{ setRetryHandler: (handler: (id: string, type: JobType) => void) => void }> = ({ setRetryHandler }) => {
  const { t } = useTranslation();
  const processedFilesRef = useRef<Set<string>>(new Set());
  const [activeSteps, setActiveSteps] = useState<string[]>([]);

  // Logic ...
  const [isGeneratorRunning, setIsGeneratorRunning] = useState(false);
  const [isTransferRunning, setIsTransferRunning] = useState(false);
  const [isMappingRunning, setIsMappingRunning] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const { writeFile, moveFile, listFiles, deleteFile } = useFileSystem();
  const { insert, select, update, remove } = useVirtualDB();
  const { dataSource, collection, delivery, topics, mappings, mappingTasks, taskFlows, connections, tables, biDashboard } = useSettings();
  const { addLog, updateLog } = useJobMonitor(); // Now valid because we are inside JobMonitorProvider

  const listFilesRef = useRef(listFiles);
  const selectRef = useRef(select);
  // ... refs ...
  const collectionLocks = useRef<Record<string, boolean>>({});
  const deliveryLocks = useRef<Record<string, boolean>>({});
  const mappingStates = useRef<Record<string, ExecutionState>>({});
  const mappingLocks = useRef<Record<string, boolean>>({});
  const fileLocks = useRef<Set<string>>(new Set());
  const sequenceStates = useRef<Record<string, Record<string, number>>>({});

  // ... Update refs on render ...
  useEffect(() => { listFilesRef.current = listFiles; }, [listFiles]);
  useEffect(() => { selectRef.current = select; }, [select]);

  // ... Helper functions (getFileLockKey, etc) ...
  const getFileLockKey = useCallback((host: string, path: string, fileName: string) => `${host}:${path}/${fileName}`, []);
  const isFileLocked = useCallback((host: string, path: string, fileName: string) => fileLocks.current.has(getFileLockKey(host, path, fileName)), [getFileLockKey]);
  const lockFile = useCallback((host: string, path: string, fileName: string) => fileLocks.current.add(getFileLockKey(host, path, fileName)), [getFileLockKey]);
  const unlockFile = useCallback((host: string, path: string, fileName: string) => fileLocks.current.delete(getFileLockKey(host, path, fileName)), [getFileLockKey]);

  const toggleStep = useCallback((step: string, active: boolean) => {
    setActiveSteps(prev => active ? (prev.includes(step) ? prev : [...prev, step]) : prev.filter(s => s !== step));
  }, []);

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  // --- Exec Logic ---
  const executeCollectionJob = useCallback(async (jobId: string) => {
    // ... logic copied from above ...
    const job = collection.jobs.find(j => j.id === jobId);
    if (!job) return;

    // Resolve Source Connection
    const sourceConn = connections.find(c => c.id === job.sourceConnectionId);
    if (!sourceConn || sourceConn.type !== 'file' || !sourceConn.host || !sourceConn.path) {
        // If connection is missing (e.g. deleted), log error and return
        setErrors(prev => {
            const msg = `Collection Job ${job.name}: Invalid Source Connection`;
            return prev.includes(msg) ? prev : [...prev, msg];
        });
        return;
    }
    const sourceHost = sourceConn.host;
    const sourcePath = sourceConn.path;

    // Resolve Target
    let targetHost = '';
    let targetPath = '';

    if (job.targetType === 'topic' && job.targetTopicId) {
        targetHost = 'localhost';
        targetPath = `/topics/${job.targetTopicId}`;
    } else {
        const targetConn = connections.find(c => c.id === job.targetConnectionId);
        if (!targetConn || targetConn.type !== 'file' || !targetConn.host || !targetConn.path) {
             setErrors(prev => {
                const msg = `Collection Job ${job.name}: Invalid Target Connection`;
                return prev.includes(msg) ? prev : [...prev, msg];
            });
            return;
        }
        targetHost = targetConn.host;
        targetPath = targetConn.path;
    }

    if (collectionLocks.current[job.id]) {
      console.warn(`Job ${job.name} is currently locked/running.`);
      return;
    }

    try {
      const currentFiles = listFilesRef.current(sourceHost, sourcePath);
      if (currentFiles.length === 0) return;

      let regex: RegExp;
      try {
        regex = new RegExp(job.filterRegex);
      } catch (e) {
        setErrors(prev => [...prev, `Collection Job ${job.name}: Invalid Regex`]);
        return;
      }

      // For retry, we might want to target a SPECIFIC file if we knew which one failed.
      // But specs say "re-run the job". So picking *a* file is acceptable for now.
      // Ideally retry context has file info, but let's stick to "try processing available files".
      const file = currentFiles.find(f => regex.test(f.name) && !isFileLocked(sourceHost, sourcePath, f.name));
      if (!file) return;

      collectionLocks.current[job.id] = true;
      lockFile(sourceHost, sourcePath, file.name);

      toggleStep(`transfer_1_${job.id}`, true);
      const startTime = Date.now();

      const logId = addLog({
        jobId: job.id,
        jobName: job.name,
        jobType: 'collection',
        status: 'running',
        startTime: startTime,
        recordsInput: 1,
        recordsOutput: 0,
        details: `Moving ${file.name}...`
      });

      try {
        const processingTime = calculateProcessingTime(file.content, job.bandwidth, collection.processingTime);
        await delay(processingTime);

        // Rename logic
        try {
          const context = {
            hostname: sourceHost,
            timestamp: new Date(),
            collectionHost: targetHost,
            fileName: file.name
          };
          const renamePattern = job.renamePattern || '${fileName}';
          const newFileName = processTemplate(renamePattern, context);

          moveFile(file.name, sourceHost, sourcePath, targetHost, targetPath, newFileName);
          setErrors(prev => prev.filter(e => !e.includes(`Collection Job ${job.name}`)));

          updateLog(logId, {
            status: 'success',
            endTime: Date.now(),
            recordsOutput: 1,
            details: `Moved ${file.name} to ${targetHost}:${targetPath}`,
            extendedDetails: {
              fileSize: file.content.length,
              bandwidth: job.bandwidth,
              throughput: (file.content.length / ((Date.now() - startTime) / 1000))
            }
          });

        } catch (e) {
          const errMsg = `Collection Job ${job.name}: Failed to move to '${targetHost}:${targetPath}'`;
          setErrors(prev => prev.includes(errMsg) ? prev : [...prev, errMsg]);
          updateLog(logId, {
            status: 'failed',
            endTime: Date.now(),
            recordsOutput: 0,
            errorMessage: errMsg,
            details: `File: ${file.name}`
          });
        }
      } finally {
        unlockFile(sourceHost, sourcePath, file.name);
        toggleStep(`transfer_1_${job.id}`, false);
        collectionLocks.current[job.id] = false;
      }
    } catch (e) {
      collectionLocks.current[job.id] = false;
    }
  }, [collection.jobs, collection.processingTime, moveFile, toggleStep, isFileLocked, lockFile, unlockFile, addLog, updateLog, connections]);

  const executeDeliveryJob = useCallback(async (jobId: string) => {
    const job = delivery.jobs.find(j => j.id === jobId);
    if (!job) return;
    if (deliveryLocks.current[job.id]) return;

    try {
      let sourceHost = '';
      let sourcePath = '';

      if (job.sourceType === 'topic' && job.sourceTopicId) {
        sourceHost = 'localhost';
        sourcePath = `/topics/${job.sourceTopicId}`;
      } else {
        const sourceConn = connections.find(c => c.id === job.sourceConnectionId);
        if (!sourceConn || sourceConn.type !== 'file' || !sourceConn.host || !sourceConn.path) {
             setErrors(prev => {
                const msg = `Delivery Job ${job.name}: Invalid Source Connection`;
                return prev.includes(msg) ? prev : [...prev, msg];
            });
            return;
        }
        sourceHost = sourceConn.host;
        sourcePath = sourceConn.path;
      }

      const targetConn = connections.find(c => c.id === job.targetConnectionId);
      if (!targetConn || targetConn.type !== 'file' || !targetConn.host || !targetConn.path) {
           setErrors(prev => {
                const msg = `Delivery Job ${job.name}: Invalid Target Connection`;
                return prev.includes(msg) ? prev : [...prev, msg];
            });
           return;
      }
      const targetHost = targetConn.host;
      const targetPath = targetConn.path;

      let currentFiles = listFilesRef.current(sourceHost, sourcePath);
      if (currentFiles.length === 0) return;

      if (job.sourceType === 'topic') {
        // Use Persistent DB State instead of memory ref
        const processedRecords = selectRef.current('_sys_subscription_state');
        const processedSet = new Set(processedRecords.filter((r: any) => r.data.jobId === job.id).map((r: any) => r.data.fileName));
        currentFiles = currentFiles.filter(f => !processedSet.has(f.name));
      }
      if (currentFiles.length === 0) return;

      let regex: RegExp;
      try {
        regex = new RegExp(job.filterRegex);
      } catch (e) {
        setErrors(prev => [...prev, `Delivery Job ${job.name}: Invalid Regex`]);
        return;
      }

      const file = currentFiles.find(f => regex.test(f.name) && !isFileLocked(sourceHost, sourcePath, f.name));
      if (!file) return;

      deliveryLocks.current[job.id] = true;
      lockFile(sourceHost, sourcePath, file.name);

      toggleStep(`transfer_2_${job.id}`, true);
      const startTime = Date.now();

      const logId = addLog({
        jobId: job.id,
        jobName: job.name,
        jobType: 'delivery',
        status: 'running',
        startTime: startTime,
        recordsInput: 1,
        recordsOutput: 0,
        details: `Delivering ${file.name}...`
      });

      try {
        const processingTime = calculateProcessingTime(file.content, job.bandwidth, job.processingTime);
        await delay(processingTime);

        try {
          if (job.sourceType === 'topic') {
            writeFile(targetHost, targetPath, file.name, file.content);
            // Persist state
            insert('_sys_subscription_state', { jobId: job.id, fileName: file.name, timestamp: Date.now() });
          } else {
            moveFile(file.name, sourceHost, sourcePath, targetHost, targetPath);
          }
          setErrors(prev => prev.filter(e => !e.includes(`Delivery Job ${job.name}`)));

          updateLog(logId, {
            status: 'success',
            endTime: Date.now(),
            recordsOutput: 1,
            details: `Delivered ${file.name} to ${targetHost}:${targetPath}`,
            extendedDetails: {
              fileSize: file.content.length,
              bandwidth: job.bandwidth,
              throughput: (file.content.length / ((Date.now() - startTime) / 1000))
            }
          });

        } catch (e) {
          const errMsg = `Delivery Job ${job.name}: Failed to move/copy to '${targetHost}:${targetPath}'`;
          setErrors(prev => prev.includes(errMsg) ? prev : [...prev, errMsg]);
          updateLog(logId, {
            status: 'failed',
            endTime: Date.now(),
            recordsOutput: 0,
            errorMessage: errMsg,
            details: `File: ${file.name}`
          });
        }
      } finally {
        unlockFile(sourceHost, sourcePath, file.name);
        toggleStep(`transfer_2_${job.id}`, false);
        deliveryLocks.current[job.id] = false;
      }
    } catch (e) {
      deliveryLocks.current[job.id] = false;
    }
  }, [delivery.jobs, moveFile, writeFile, toggleStep, isFileLocked, lockFile, unlockFile, processedFilesRef, addLog, updateLog, connections]);

  const executeMappingJob = useCallback(async (taskId: string, parentLogId?: string) => {
    const task = mappingTasks.find(t => t.id === taskId);
    if (!task) return;
    if (mappingLocks.current[task.id]) return;

    const mapping = mappings.find(m => m.id === task.mappingId);
    if (!mapping) return;

    // ... checks ...
    const sources = mapping.transformations.filter(t => t.type === 'source');
    if (sources.length === 0) return;

    mappingLocks.current[task.id] = true;
    toggleStep(`mapping_task_${task.id}`, true);
    const startTime = Date.now();

    // Initial Log
    const logId = addLog({
        jobId: task.id,
        jobName: task.name,
        jobType: 'mapping',
        status: 'running',
        startTime: startTime,
        recordsInput: 0,
        recordsOutput: 0,
        details: `Initializing mapping ${mapping.name}...`,
        parentLogId: parentLogId
    });

    try {
      if (!mappingStates.current[task.id]) mappingStates.current[task.id] = {};

      // Define Observer
      const observer = (stats: ExecutionStats) => {
          const totalInput = Object.values(stats.transformations).reduce((acc, s) => acc + s.input, 0);
          const totalOutput = Object.values(stats.transformations).reduce((acc, s) => acc + s.output, 0);
          updateLog(logId, {
              recordsInput: totalInput,
              recordsOutput: totalOutput,
              extendedDetails: stats,
              details: `Processing... (${totalInput} rows)`
          });
      };

      const { stats, newState } = await executeMappingTaskRecursive(
        task,
        mapping,
        connections,
        tables,
        {
          listFiles: listFilesRef.current,
          readFile: (h, p, f) => {
            const files = listFilesRef.current(h, p);
            return files.find(fi => fi.name === f)?.content || '';
          },
          deleteFile: deleteFile,
          writeFile: writeFile
        },
        { select: selectRef.current, insert: insert, update: update, delete: remove },
        mappingStates.current[task.id],
        observer
      );

      mappingStates.current[task.id] = newState;

      const totalInput = Object.values(stats.transformations).reduce((acc, s) => acc + s.input, 0);
      const totalOutput = Object.values(stats.transformations).reduce((acc, s) => acc + s.output, 0);
      const totalErrors = Object.values(stats.transformations).reduce((acc, s) => acc + s.errors, 0);

      updateLog(logId, {
        status: totalErrors > 0 ? 'failed' : 'success',
        endTime: Date.now(),
        recordsInput: totalInput,
        recordsOutput: totalOutput,
        details: `Processed via mapping ${mapping.name}`,
        errorMessage: totalErrors > 0 ? `${totalErrors} errors occurred` : undefined,
        extendedDetails: stats
      });

      if (totalErrors > 0) {
        setErrors(prev => [...prev, `Task ${task.name}: ${totalErrors} errors`]);
      } else {
        setErrors(prev => prev.filter(e => !e.includes(`Task ${task.name}`)));

        // Workflow: Trigger downstream tasks
        const downstreamTasks = mappingTasks.filter(t => t.dependencies?.includes(taskId));
        downstreamTasks.forEach(t => {
          console.log(`[Workflow] Task ${task.name} finished. Triggering dependent task ${t.name}...`);
          // Trigger with a slight delay to allow UI to update and visualize sequence
          setTimeout(() => executeMappingJob(t.id), 500);
        });
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Unknown error';
      updateLog(logId, {
        status: 'failed',
        endTime: Date.now(),
        errorMessage: errMsg,
        details: `Fatal error in mapping execution`
      });
    } finally {
      await new Promise(res => setTimeout(res, 500));
      toggleStep(`mapping_task_${task.id}`, false);
      mappingLocks.current[task.id] = false;
    }
  }, [mappingTasks, mappings, connections, tables, toggleStep, insert, writeFile, deleteFile, addLog, updateLog]);

  const executeTaskFlow = useCallback(async (flowId: string) => {
    const flow = taskFlows.find(f => f.id === flowId);
    if (!flow || !flow.enabled) return;

    toggleStep(`task_flow_${flow.id}`, true);
    const startTime = Date.now();
    const logId = addLog({
        jobId: flow.id,
        jobName: flow.name,
        jobType: 'taskflow',
        status: 'running',
        startTime: startTime,
        recordsInput: 0,
        recordsOutput: 0,
        details: `Starting flow execution (${flow.parallelExecution ? 'Parallel' : 'Sequential'})...`
    });

    try {
        if (flow.parallelExecution) {
            await Promise.all(flow.taskIds.map(taskId => executeMappingJob(taskId, logId)));
        } else {
            for (const taskId of flow.taskIds) {
                await executeMappingJob(taskId, logId);
            }
        }
        
        updateLog(logId, {
            status: 'success',
            endTime: Date.now(),
            details: `Flow finished successfully.`
        });
    } catch (e) {
        updateLog(logId, {
            status: 'failed',
            endTime: Date.now(),
            errorMessage: e instanceof Error ? e.message : 'Unknown error during flow execution'
        });
    } finally {
        toggleStep(`task_flow_${flow.id}`, false);
    }
  }, [taskFlows, executeMappingJob, addLog, updateLog]);

  // --- Register Retry Handler ---
  useEffect(() => {
    setRetryHandler((jobId, jobType) => {
      console.log(`Retrying ${jobType} job: ${jobId}`);
      if (jobType === 'collection') executeCollectionJob(jobId);
      if (jobType === 'delivery') executeDeliveryJob(jobId);
      if (jobType === 'mapping') executeMappingJob(jobId);
    });
  }, [setRetryHandler, executeCollectionJob, executeDeliveryJob, executeMappingJob]);

  // --- Timers (Generator, Collection, Delivery, Mapping, Topic) ---
  useEffect(() => {
    if (!isGeneratorRunning) return;
    const timers = dataSource.jobs.map(job => {
      if (!job.enabled) return null;
      const def = dataSource.definitions.find(d => d.id === job.dataSourceId);
      if (!def) return null;
      return setInterval(() => {
        const ctx = { hostname: def.host, timestamp: new Date() };
        let content = '';
        if (job.mode === 'schema' && job.schema) {
          const { content: newContent, nextSequenceState } = generateDataFromSchema(
            job.schema,
            job.rowCount || 1,
            ctx,
            sequenceStates.current[job.id] || {}
          );
          content = newContent;
          sequenceStates.current[job.id] = nextSequenceState;
        } else {
          content = processTemplate(job.fileContent, ctx);
        }
        writeFile(def.host, def.path, processTemplate(job.fileNamePattern, ctx), content);
      }, job.executionInterval);
    }).filter(Boolean) as ReturnType<typeof setInterval>[];
    return () => timers.forEach(clearInterval);
  }, [isGeneratorRunning, dataSource, writeFile]);

  useEffect(() => {
    if (!isTransferRunning) return;
    const timers = collection.jobs.map(job => {
      if (!job.enabled) return null;
      return setInterval(() => executeCollectionJob(job.id), job.executionInterval);
    }).filter(Boolean) as ReturnType<typeof setInterval>[];
    return () => timers.forEach(clearInterval);
  }, [isTransferRunning, collection.jobs, executeCollectionJob]);

  useEffect(() => {
    if (!isTransferRunning) return;
    const timers = delivery.jobs.map(job => {
      if (!job.enabled) return null;
      return setInterval(() => executeDeliveryJob(job.id), job.executionInterval);
    }).filter(Boolean) as ReturnType<typeof setInterval>[];
    return () => timers.forEach(clearInterval);
  }, [isTransferRunning, delivery.jobs, executeDeliveryJob]);

  useEffect(() => {
    if (!isMappingRunning) return;
    const timers = mappingTasks.map(task => {
      if (!task.enabled) return null;
      // Workflow: Only schedule tasks that have NO dependencies (Root tasks)
      // AND are NOT part of an enabled Task Flow (to avoid double execution)
      if (task.dependencies && task.dependencies.length > 0) return null;
      if (taskFlows.some(f => f.enabled && f.taskIds.includes(task.id))) return null;

      return setInterval(() => executeMappingJob(task.id), task.executionInterval);
    }).filter(Boolean) as ReturnType<typeof setInterval>[];
    return () => timers.forEach(clearInterval);
  }, [isMappingRunning, mappingTasks, taskFlows, executeMappingJob]);

  useEffect(() => {
    if (!isMappingRunning) return;
    const timers = taskFlows.map(flow => {
      if (!flow.enabled) return null;
      return setInterval(() => executeTaskFlow(flow.id), flow.executionInterval);
    }).filter(Boolean) as ReturnType<typeof setInterval>[];
    return () => timers.forEach(clearInterval);
  }, [isMappingRunning, taskFlows, executeTaskFlow]);

  // Topic Retention
  useEffect(() => {
    if (!isGeneratorRunning && !isTransferRunning && !isMappingRunning) return;
    const interval = setInterval(() => {
      topics.forEach(topic => {
        listFilesRef.current('localhost', `/topics/${topic.id}`).forEach(f => {
          if (Date.now() - f.createdAt > topic.retentionPeriod) {
            deleteFile('localhost', f.name, `/topics/${topic.id}`);
          }
        });
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isGeneratorRunning, isTransferRunning, isMappingRunning, topics, deleteFile]);

  const handleCreateSourceFile = () => {
    dataSource.jobs.forEach(job => {
      if (!job.enabled) return;
      const d = dataSource.definitions.find(def => def.id === job.dataSourceId);
      if (d) {
        const ctx = { hostname: d.host, timestamp: new Date() };
        let content = '';
        if (job.mode === 'schema' && job.schema) {
          const { content: newContent, nextSequenceState } = generateDataFromSchema(
            job.schema,
            job.rowCount || 1,
            ctx,
            sequenceStates.current[job.id] || {}
          );
          content = newContent;
          sequenceStates.current[job.id] = nextSequenceState;
        } else {
          content = processTemplate(job.fileContent, ctx);
        }
        writeFile(d.host, d.path, processTemplate(job.fileNamePattern, ctx), content);
      }
    });
  };

  const safeListFiles = useCallback((host: string, path: string) => {
    try {
      return listFiles(host, path);
    } catch {
      return [];
    }
  }, [listFiles]);

  return (
    <>
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8`}>
        <div className="flex flex-col gap-4">
          <div className="p-3 sm:p-4 bg-white rounded shadow space-y-4">
            <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <Activity className="w-5 h-5" /> {t('app.control.title')}
            </h2>
            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded text-xs sm:text-sm flex flex-col gap-1">
                <div className="font-bold flex items-center gap-1"><AlertTriangle size={14} /> Errors Detected:</div>
                <ul className="list-disc list-inside">
                  {errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
                <button onClick={() => setErrors([])} className="text-xs text-red-500 hover:underline self-end">Clear</button>
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => {
                  const all = isGeneratorRunning && isTransferRunning && isMappingRunning;
                  setIsGeneratorRunning(!all); setIsTransferRunning(!all); setIsMappingRunning(!all);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded transition-colors text-xs sm:text-sm ${isGeneratorRunning && isTransferRunning && isMappingRunning ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
              >
                {isGeneratorRunning && isTransferRunning && isMappingRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />} {t('app.control.all')}
              </button>
              <button onClick={() => setIsGeneratorRunning(!isGeneratorRunning)} className={`flex items-center gap-2 px-3 py-2 rounded transition-colors text-xs sm:text-sm ${isGeneratorRunning ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>{isGeneratorRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />} {t('app.control.gen')}</button>
              <button onClick={() => setIsTransferRunning(!isTransferRunning)} className={`flex items-center gap-2 px-3 py-2 rounded transition-colors text-xs sm:text-sm ${isTransferRunning ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>{isTransferRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />} {t('app.control.trans')}</button>
              <button onClick={() => setIsMappingRunning(!isMappingRunning)} className={`flex items-center gap-2 px-3 py-2 rounded transition-colors text-xs sm:text-sm ${isMappingRunning ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{isMappingRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />} {t('app.control.map')}</button>
              <button
                onClick={handleCreateSourceFile}
                className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition-colors text-xs sm:text-sm"
              >
                <FilePlus className="w-4 h-4" /> <span className="hidden xs:inline">{t('app.control.createFile')}</span><span className="xs:hidden">File+</span>
              </button>
            </div>

            {/* Storage Views... reused logic */}
            <StorageViews dataSource={dataSource} collection={collection} delivery={delivery} topics={topics} listFiles={safeListFiles} connections={connections} />

            {/* DB View */}
            <DatabaseView tables={tables} select={select} />
          </div>
        </div>
        <div className="flex flex-col gap-4">
          {biDashboard.showDashboard && (
            <div className="h-[700px] sm:h-[800px]">
              <BiDashboard />
            </div>
          )}
          <div className="h-[400px] sm:h-[500px] bg-white rounded shadow border border-gray-200 overflow-hidden">
            <PipelineFlow activeSteps={activeSteps} />
          </div>
        </div>
      </div>
    </>
  );
};

import { type DataSourceSettings, type CollectionSettings, type DeliverySettings, type TopicDefinition, type TableDefinition, type ConnectionDefinition } from './lib/SettingsContext';

// Helper Components for Cleaner Render
interface StorageViewsProps {
  dataSource: DataSourceSettings;
  collection: CollectionSettings;
  delivery: DeliverySettings;
  topics: TopicDefinition[];
  connections: ConnectionDefinition[];
  listFiles: (host: string, path: string) => VFile[];
}

const StorageViews: React.FC<StorageViewsProps> = ({ dataSource, collection, delivery, topics, connections, listFiles }) => {
  const { t } = useTranslation();
  // ... same logic for gathering storages ...
  const sourceStorages = dataSource.definitions.map((d) => ({ name: d.name, host: d.host, path: d.path, type: 'source' }));
  const topicStorages = topics.map((t) => ({ name: t.name, host: 'localhost', path: `/topics/${t.id}`, type: 'topic' }));
  const incomingPaths = new Set<string>();
  const incomingStorages: { host: string, path: string, type: 'incoming' }[] = [];
  collection.jobs.forEach((job) => {
    if (job.targetType === 'topic') return;
    const conn = connections.find(c => c.id === job.targetConnectionId);
    if (conn && conn.type === 'file' && conn.host && conn.path) {
        const key = `${conn.host}:${conn.path}`;
        if (!incomingPaths.has(key)) { incomingPaths.add(key); incomingStorages.push({ host: conn.host, path: conn.path, type: 'incoming' }); }
    }
  });
  const internalPaths = new Set<string>();
  const internalStorages: { host: string, path: string, type: 'internal' }[] = [];
  delivery.jobs.forEach((job) => {
    const conn = connections.find(c => c.id === job.targetConnectionId);
    if (conn && conn.type === 'file' && conn.host && conn.path) {
        const key = `${conn.host}:${conn.path}`;
        if (!internalPaths.has(key)) { internalPaths.add(key); internalStorages.push({ host: conn.host, path: conn.path, type: 'internal' }); }
    }
  });

  return (
    <div className="space-y-4">
      <div className="border p-2 sm:p-3 rounded bg-gray-50/50">
        <h3 className="font-bold border-b mb-2 pb-1 text-gray-700 flex items-center gap-2 text-xs sm:text-sm"><span className="w-2 h-2 rounded-full bg-green-500"></span> {t('app.storage.source')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {sourceStorages.map((s) => <StorageView key={`${s.host}:${s.path}`} {...s} files={listFiles(s.host, s.path)} />)}
        </div>
      </div>
      <div className="border p-2 sm:p-3 rounded bg-gray-50/50">
        <h3 className="font-bold border-b mb-2 pb-1 text-gray-700 flex items-center gap-2 text-xs sm:text-sm"><span className="w-2 h-2 rounded-full bg-orange-500"></span> {t('app.storage.intermediate')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {topicStorages.map((s) => <StorageView key={`topic-${s.name}`} {...s} files={listFiles(s.host, s.path)} />)}
          {incomingStorages.map((s) => <StorageView key={`${s.host}:${s.path}`} {...s} files={listFiles(s.host, s.path)} />)}
        </div>
      </div>
      <div className="border p-2 sm:p-3 rounded bg-gray-50/50">
        <h3 className="font-bold border-b mb-2 pb-1 text-gray-700 flex items-center gap-2 text-xs sm:text-sm"><span className="w-2 h-2 rounded-full bg-blue-500"></span> {t('app.storage.internal')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {internalStorages.map((s) => <StorageView key={`${s.host}:${s.path}`} {...s} files={listFiles(s.host, s.path)} />)}
        </div>
      </div>
    </div>
  );
}

interface DatabaseViewProps {
  tables: TableDefinition[];
  select: (tableName: string) => any[];
}

const DatabaseView: React.FC<DatabaseViewProps> = ({ tables, select }) => {
  const { t } = useTranslation();
  const [dbViewMode, setDbViewMode] = useState<'text' | 'table'>('table');
  return (
    <div className="border p-2 sm:p-3 rounded bg-gray-50/50">
      <div className="flex justify-between items-center mb-2 border-b pb-1">
        <h3 className="font-bold text-gray-700 flex items-center gap-2 text-xs sm:text-sm"><span className="w-2 h-2 rounded-full bg-gray-600"></span> {t('app.storage.database')}</h3>
        <div className="flex bg-white rounded border p-0.5">
          <button onClick={() => setDbViewMode('text')} className={`p-1 rounded ${dbViewMode === 'text' ? 'bg-gray-200' : 'text-gray-400'}`}><List size={12} /></button>
          <button onClick={() => setDbViewMode('table')} className={`p-1 rounded ${dbViewMode === 'table' ? 'bg-gray-200' : 'text-gray-400'}`}><Grid3X3 size={12} /></button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {tables.map((table) => {
          const records = select(table.name);
          return (
            <div key={table.id} className="text-xs border border-gray-200 p-2 rounded bg-white shadow-sm flex flex-col">
              <h4 className="font-semibold text-gray-700 mb-1 truncate" title={table.name}>{table.name}</h4>
              <div className="h-32 sm:h-48 overflow-auto bg-gray-50 p-1 rounded-sm border border-gray-100 flex-grow relative">
                {dbViewMode === 'text' ? (
                  records.length === 0 ? <span className="text-gray-400 italic text-[10px]">No records</span> :
                    <ul className="space-y-1">{records.map((r: any) => <li key={r.id} className="truncate text-[10px] sm:text-[11px] font-mono">{JSON.stringify(r.data)}</li>)}</ul>
                ) : (
                  <table className="w-full text-left border-collapse min-w-[300px]">
                    <thead className="bg-gray-100 sticky top-0"><tr>{Object.keys(records[0]?.data || table.columns.reduce((a: any, c: any) => ({ ...a, [c.name]: '' }), {})).map((k: any) => <th key={k} className="p-1 border-b text-[10px]">{k}</th>)}</tr></thead>
                    <tbody>{records.map((r: any, i: number) => <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>{Object.keys(r.data).map((k: any) => <td key={k} className="p-1 border-b truncate max-w-[80px] text-[10px]">{String(r.data[k])}</td>)}</tr>)}</tbody>
                  </table>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  )
}

function App() {
  const retryHandlerRef = useRef<(id: string, type: JobType) => void>(() => { });
  const retryWrapper = useCallback((id: string, type: JobType) => retryHandlerRef.current(id, type), []);
  const [activeTab, setActiveTab] = useState<'simulation' | 'dashboard' | 'monitor' | 'settings' | 'documentation'>('simulation');
  const { saveSettings } = useSettings();
  const { t, language, setLanguage } = useTranslation();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleSave = () => {
    const res = saveSettings();
    setSaveMessage(res.success ? "Settings saved." : "Failed to save.");
    setTimeout(() => setSaveMessage(null), 3000);
  }

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ja' : 'en');
  };

  return (
    <JobMonitorProvider retryJob={retryWrapper}>
      <div className="min-h-screen bg-gray-100 p-2 sm:p-4 md:p-8 flex flex-col gap-4 sm:gap-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
             <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">{t('app.title')}</h1>
             <button
               onClick={toggleLanguage}
               className="flex items-center gap-1 text-xs sm:text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded"
               title="Toggle Language"
             >
               <Globe size={14} /> {language.toUpperCase()}
             </button>
          </div>

          <div className="flex bg-white rounded-lg shadow p-1 w-full sm:w-auto overflow-x-auto">
            <button onClick={() => setActiveTab('simulation')} className={`px-3 sm:px-4 py-2 rounded-md flex gap-2 items-center text-sm sm:text-base whitespace-nowrap ${activeTab === 'simulation' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}><Activity size={16} /> <span className="hidden xs:inline">{t('app.tabs.simulation')}</span></button>
            <button onClick={() => setActiveTab('dashboard')} className={`px-3 sm:px-4 py-2 rounded-md flex gap-2 items-center text-sm sm:text-base whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}><Grid3X3 size={16} /> <span className="hidden xs:inline">{t('app.tabs.dashboard')}</span></button>
            <button onClick={() => setActiveTab('monitor')} className={`px-3 sm:px-4 py-2 rounded-md flex gap-2 items-center text-sm sm:text-base whitespace-nowrap ${activeTab === 'monitor' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}><MonitorPlay size={16} /> <span className="hidden xs:inline">{t('app.tabs.monitor')}</span></button>
            <button onClick={() => setActiveTab('settings')} className={`px-3 sm:px-4 py-2 rounded-md flex gap-2 items-center text-sm sm:text-base whitespace-nowrap ${activeTab === 'settings' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}><Settings size={16} /> <span className="hidden xs:inline">{t('app.tabs.settings')}</span></button>
            <button onClick={() => setActiveTab('documentation')} className={`px-3 sm:px-4 py-2 rounded-md flex gap-2 items-center text-sm sm:text-base whitespace-nowrap ${activeTab === 'documentation' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}><Book size={16} /> <span className="hidden xs:inline">{t('app.tabs.docs')}</span></button>
          </div>
        </div>

        <div className={activeTab === 'simulation' ? '' : 'hidden'}>
          <SimulationManager setRetryHandler={(fn) => retryHandlerRef.current = fn} />
        </div>

        {activeTab === 'dashboard' && (
          <div className="flex-grow min-h-[500px] h-[calc(100vh-180px)]">
            <BiDashboard />
          </div>
        )}

        {activeTab === 'monitor' && <div className="h-[calc(100vh-140px)]"><JobMonitor /></div>}

        {activeTab === 'settings' && (
          <div className="bg-white rounded shadow p-4 sm:p-6 border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><Settings size={24} /> {t('settings.title')}</h2>
              <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm sm:text-base">Save Settings</button>
            </div>
            {saveMessage && <div className="mb-4 p-3 rounded bg-blue-50 text-blue-700">{saveMessage}</div>}
            <SettingsPanel />
          </div>
        )}

        {activeTab === 'documentation' && (
          <div className="h-[calc(100vh-140px)]">
            <Documentation />
          </div>
        )}
      </div>
    </JobMonitorProvider>
  );
}

export default function AppWrapper() {
  return (
    <SettingsProvider>
      <VirtualDBProvider>
        <FileSystemProvider>
          <LanguageProvider>
            <App />
          </LanguageProvider>
        </FileSystemProvider>
      </VirtualDBProvider>
    </SettingsProvider>
  );
}
