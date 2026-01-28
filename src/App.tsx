import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FileSystemProvider, useFileSystem, type VFile } from './lib/VirtualFileSystem';
import { VirtualDBProvider, useVirtualDB } from './lib/VirtualDB';
import { SettingsProvider, useSettings } from './lib/SettingsContext';
import { JobMonitorProvider, useJobMonitor } from './lib/JobMonitorContext';
import PipelineFlow from './components/PipelineFlow';
import SettingsPanel from './components/settings/SettingsPanel';
import JobMonitor from './components/JobMonitor';
import { processTemplate } from './lib/templateUtils';
import { executeMappingTaskRecursive, type ExecutionState } from './lib/MappingEngine';
import 'reactflow/dist/style.css';
import { Settings, Play, Pause, Activity, FilePlus, AlertTriangle, List, Grid3X3, MonitorPlay } from 'lucide-react';

interface SimulationControlProps {
  activeSteps: string[];
  setActiveSteps: React.Dispatch<React.SetStateAction<string[]>>;
  processedFilesRef: React.MutableRefObject<Set<string>>;
}

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

const SimulationControl: React.FC<SimulationControlProps> = ({ setActiveSteps, processedFilesRef }) => {
  const [isGeneratorRunning, setIsGeneratorRunning] = useState(false);
  const [isTransferRunning, setIsTransferRunning] = useState(false);
  const [isMappingRunning, setIsMappingRunning] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [dbViewMode, setDbViewMode] = useState<'text' | 'table'>('text');
  const { writeFile, moveFile, listFiles, deleteFile } = useFileSystem();
  const { insert, select } = useVirtualDB();
  const { dataSource, collection, delivery, topics, mappings, mappingTasks, connections, tables } = useSettings();
  const { addLog } = useJobMonitor();

  const listFilesRef = useRef(listFiles);
  const selectRef = useRef(select);

  useEffect(() => {
    listFilesRef.current = listFiles;
  }, [listFiles]);

  useEffect(() => {
    selectRef.current = select;
  }, [select]);

  const collectionLocks = useRef<Record<string, boolean>>({});
  const deliveryLocks = useRef<Record<string, boolean>>({});
  const mappingStates = useRef<Record<string, ExecutionState>>({});
  const mappingLocks = useRef<Record<string, boolean>>({});
  const fileLocks = useRef<Set<string>>(new Set());

  const getFileLockKey = useCallback((host: string, path: string, fileName: string) => {
    return `${host}:${path}/${fileName}`;
  }, []);

  const isFileLocked = useCallback((host: string, path: string, fileName: string) => {
    return fileLocks.current.has(getFileLockKey(host, path, fileName));
  }, [getFileLockKey]);

  const lockFile = useCallback((host: string, path: string, fileName: string) => {
    fileLocks.current.add(getFileLockKey(host, path, fileName));
  }, [getFileLockKey]);

  const unlockFile = useCallback((host: string, path: string, fileName: string) => {
    fileLocks.current.delete(getFileLockKey(host, path, fileName));
  }, [getFileLockKey]);

  const toggleStep = useCallback((step: string, active: boolean) => {
    setActiveSteps(prev => {
      if (active) {
        return prev.includes(step) ? prev : [...prev, step];
      } else {
        return prev.filter(s => s !== step);
      }
    });
  }, [setActiveSteps]);

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  // 1. Data Source Generation
  useEffect(() => {
    if (!isGeneratorRunning) return;
    const timers: ReturnType<typeof setInterval>[] = [];

    dataSource.jobs.forEach(job => {
      if (!job.enabled) return;

      const definition = dataSource.definitions.find(d => d.id === job.dataSourceId);
      if (!definition) return;

      const timer = setInterval(() => {
        const context = { hostname: definition.host, timestamp: new Date() };
        const fileName = processTemplate(job.fileNamePattern, context);
        const fileContent = processTemplate(job.fileContent, context);
        writeFile(definition.host, definition.path, fileName, fileContent);
      }, job.executionInterval);
      timers.push(timer);
    });

    return () => timers.forEach(clearInterval);
  }, [isGeneratorRunning, dataSource.jobs, dataSource.definitions, writeFile]);

  // 2. Collection
  useEffect(() => {
    if (!isTransferRunning) return; // Only run when simulation is active

    const timers: ReturnType<typeof setInterval>[] = [];

    collection.jobs.forEach(job => {
      if (!job.enabled) return;

      const timer = setInterval(async () => {
        if (collectionLocks.current[job.id]) return;

        try {
          const currentFiles = listFilesRef.current(job.sourceHost, job.sourcePath);
          if (currentFiles.length === 0) return;

          let regex: RegExp;
          try {
            regex = new RegExp(job.filterRegex);
          } catch (e) {
            setErrors(prev => {
              const msg = `Collection Job ${job.name}: Invalid Regex`;
              return prev.includes(msg) ? prev : [...prev, msg];
            });
            return;
          }

          const file = currentFiles.find(f => regex.test(f.name) && !isFileLocked(job.sourceHost, job.sourcePath, f.name));
          if (!file) return;

          collectionLocks.current[job.id] = true;
          lockFile(job.sourceHost, job.sourcePath, file.name);

          toggleStep(`transfer_1_${job.id}`, true);
          const startTime = Date.now();

          try {
            const processingTime = calculateProcessingTime(file.content, job.bandwidth, collection.processingTime);
            await delay(processingTime);

            let targetHost = job.targetHost;
            let targetPath = job.targetPath;

            if (job.targetType === 'topic' && job.targetTopicId) {
              targetHost = 'localhost';
              targetPath = `/topics/${job.targetTopicId}`;
            }

            try {
              const context = {
                hostname: job.sourceHost,
                timestamp: new Date(),
                collectionHost: targetHost,
                fileName: file.name
              };
              const renamePattern = job.renamePattern || '${fileName}';
              const newFileName = processTemplate(renamePattern, context);

              moveFile(file.name, job.sourceHost, job.sourcePath, targetHost, targetPath, newFileName);
              setErrors(prev => prev.filter(e => !e.includes(`Collection Job ${job.name}`)));

              // Log Success
              addLog({
                jobId: job.id,
                jobName: job.name,
                jobType: 'collection',
                status: 'success',
                startTime: startTime,
                endTime: Date.now(),
                recordsInput: 1,
                recordsOutput: 1,
                details: `Moved ${file.name} to ${targetHost}:${targetPath}`
              });

            } catch (e) {
              const errMsg = `Collection Job ${job.name}: Failed to move to '${targetHost}:${targetPath}'`;
              setErrors(prev => {
                return prev.includes(errMsg) ? prev : [...prev, errMsg];
              });

              // Log Error
              addLog({
                jobId: job.id,
                jobName: job.name,
                jobType: 'collection',
                status: 'failed',
                startTime: startTime,
                endTime: Date.now(),
                recordsInput: 1,
                recordsOutput: 0,
                errorMessage: errMsg,
                details: `File: ${file.name}`
              });
            }
          } finally {
            unlockFile(job.sourceHost, job.sourcePath, file.name);
            toggleStep(`transfer_1_${job.id}`, false);
            collectionLocks.current[job.id] = false;
          }
        } catch (e) {
          if (collectionLocks.current[job.id]) {
            collectionLocks.current[job.id] = false;
          }
        }
      }, job.executionInterval);

      timers.push(timer);
    });

    return () => timers.forEach(clearInterval);
  }, [isTransferRunning, collection.jobs, collection.processingTime, moveFile, toggleStep, isFileLocked, lockFile, unlockFile, addLog]);

  // 3. Delivery
  useEffect(() => {
    if (!isTransferRunning) return; // Only run when simulation is active

    const timers: ReturnType<typeof setInterval>[] = [];

    delivery.jobs.forEach(job => {
      if (!job.enabled) return;

      const timer = setInterval(async () => {
        if (deliveryLocks.current[job.id]) return;

        try {
          let sourceHost = job.sourceHost;
          let sourcePath = job.sourcePath;

          if (job.sourceType === 'topic' && job.sourceTopicId) {
            sourceHost = 'localhost';
            sourcePath = `/topics/${job.sourceTopicId}`;
          }

          let currentFiles = listFilesRef.current(sourceHost, sourcePath);
          if (currentFiles.length === 0) return;

          if (job.sourceType === 'topic') {
            currentFiles = currentFiles.filter(f => !processedFilesRef.current.has(`${job.id}:${f.name}`));
          }

          if (currentFiles.length === 0) return;

          let regex: RegExp;
          try {
            regex = new RegExp(job.filterRegex);
          } catch (e) {
            setErrors(prev => {
              const msg = `Delivery Job ${job.name}: Invalid Regex`;
              return prev.includes(msg) ? prev : [...prev, msg];
            });
            return;
          }

          const file = currentFiles.find(f => regex.test(f.name) && !isFileLocked(sourceHost, sourcePath, f.name));
          if (!file) return;

          deliveryLocks.current[job.id] = true;
          lockFile(sourceHost, sourcePath, file.name);

          toggleStep(`transfer_2_${job.id}`, true);
          const startTime = Date.now();

          try {
            const processingTime = calculateProcessingTime(file.content, job.bandwidth, job.processingTime);
            await delay(processingTime);

            try {
              if (job.sourceType === 'topic') {
                writeFile(job.targetHost, job.targetPath, file.name, file.content);
                processedFilesRef.current.add(`${job.id}:${file.name}`);
              } else {
                moveFile(file.name, sourceHost, sourcePath, job.targetHost, job.targetPath);
              }
              setErrors(prev => prev.filter(e => !e.includes(`Delivery Job ${job.name}`)));

              // Log Success
              addLog({
                jobId: job.id,
                jobName: job.name,
                jobType: 'delivery',
                status: 'success',
                startTime: startTime,
                endTime: Date.now(),
                recordsInput: 1,
                recordsOutput: 1,
                details: `Delivered ${file.name} to ${job.targetHost}:${job.targetPath}`
              });

            } catch (e) {
              const errMsg = `Delivery Job ${job.name}: Failed to move/copy to '${job.targetHost}:${job.targetPath}'`;
              setErrors(prev => {
                return prev.includes(errMsg) ? prev : [...prev, errMsg];
              });

              // Log Error
              addLog({
                jobId: job.id,
                jobName: job.name,
                jobType: 'delivery',
                status: 'failed',
                startTime: startTime,
                endTime: Date.now(),
                recordsInput: 1,
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
          if (deliveryLocks.current[job.id]) {
            deliveryLocks.current[job.id] = false;
          }
        }
      }, job.executionInterval);

      timers.push(timer);
    });
    return () => timers.forEach(clearInterval);
  }, [isTransferRunning, delivery.jobs, moveFile, writeFile, toggleStep, isFileLocked, lockFile, unlockFile, processedFilesRef, addLog]);

  // 6. Topic Retention
  useEffect(() => {
    const anyRunning = isGeneratorRunning || isTransferRunning || isMappingRunning;
    if (!anyRunning) return;

    const interval = setInterval(() => {
      topics.forEach(topic => {
        const files = listFilesRef.current('localhost', `/topics/${topic.id}`);
        const now = Date.now();
        files.forEach(f => {
          if (now - f.createdAt > topic.retentionPeriod) {
            deleteFile('localhost', f.name, `/topics/${topic.id}`);
            console.log(`[Retention] Deleted expired file ${f.name} from topic ${topic.name}`);
          }
        });
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isGeneratorRunning, isTransferRunning, isMappingRunning, topics, deleteFile]);

  // 7. Mapping Tasks Execution
  useEffect(() => {
    if (!isMappingRunning) return; // Only run when simulation is active

    const timers: ReturnType<typeof setInterval>[] = [];

    mappingTasks.forEach(task => {
      if (!task.enabled) return;

      const timer = setInterval(async () => {
        if (mappingLocks.current[task.id]) return;

        const mapping = mappings.find(m => m.id === task.mappingId);
        if (!mapping) {
          console.warn(`[MappingTask] Mapping not found for task ${task.name} (mappingId: ${task.mappingId})`);
          return;
        }

        // Check if mapping has source nodes with valid connections
        const sources = mapping.transformations.filter(t => t.type === 'source');
        if (sources.length === 0) {
          console.warn(`[MappingTask] No source nodes in mapping for task ${task.name}`);
          return;
        }

        mappingLocks.current[task.id] = true;
        toggleStep(`mapping_task_${task.id}`, true);
        const startTime = Date.now();

        try {
          if (!mappingStates.current[task.id]) {
            mappingStates.current[task.id] = {};
          }

          const { stats, newState } = await executeMappingTaskRecursive(
            task,
            mapping,
            connections,
            tables,
            {
              listFiles: listFilesRef.current,
              readFile: (h, p, f) => {
                const files = listFilesRef.current(h, p);
                const file = files.find(fi => fi.name === f);
                if (!file) {
                  console.warn(`[MappingTask] File not found: ${h}:${p}/${f}`);
                }
                return file ? file.content : '';
              },
              deleteFile: deleteFile,
              writeFile: writeFile
            },
            {
              select: selectRef.current,
              insert: insert
            },
            mappingStates.current[task.id]
          );

          mappingStates.current[task.id] = newState;

          const totalInput = Object.values(stats).reduce((acc, s) => acc + s.input, 0);
          const totalOutput = Object.values(stats).reduce((acc, s) => acc + s.output, 0);
          const totalErrors = Object.values(stats).reduce((acc, s) => acc + s.errors, 0);

          if (totalInput > 0 || totalOutput > 0) {
            console.log(`[MappingTask] ${task.name}: input=${totalInput}, output=${totalOutput}`);

            // Log Success
            // We only log if something was actually processed to avoid spamming empty logs
            addLog({
              jobId: task.id,
              jobName: task.name,
              jobType: 'mapping',
              status: totalErrors > 0 ? 'failed' : 'success',
              startTime: startTime,
              endTime: Date.now(),
              recordsInput: totalInput, // This is sum of all node inputs, might want to refine to just source inputs
              recordsOutput: totalOutput, // Similarly, this is sum of all outputs
              details: `Processed via mapping ${mapping.name}`,
              errorMessage: totalErrors > 0 ? `${totalErrors} errors occurred` : undefined
            });
          }

          if (totalErrors > 0) {
            setErrors(prev => {
              const msg = `Task ${task.name}: ${totalErrors} errors`;
              return prev.includes(msg) ? prev : [...prev, msg];
            });
          } else {
            setErrors(prev => prev.filter(e => !e.includes(`Task ${task.name}`)));
          }

        } catch (e) {
          console.error(`Task ${task.name} failed`, e);
          const errMsg = e instanceof Error ? e.message : 'Unknown error';
          addLog({
            jobId: task.id,
            jobName: task.name,
            jobType: 'mapping',
            status: 'failed',
            startTime: startTime,
            endTime: Date.now(),
            recordsInput: 0,
            recordsOutput: 0,
            errorMessage: errMsg,
            details: `Fatal error in mapping execution`
          });

        } finally {
          // Short delay to show the active state
          await new Promise(res => setTimeout(res, 500));
          toggleStep(`mapping_task_${task.id}`, false);
          mappingLocks.current[task.id] = false;
        }
      }, task.executionInterval);
      timers.push(timer);
    });

    return () => timers.forEach(clearInterval);
  }, [isMappingRunning, mappingTasks, mappings, connections, tables, toggleStep, insert, writeFile, deleteFile, addLog]);

  const handleCreateSourceFile = () => {
    dataSource.jobs.forEach(job => {
      if (job.enabled) {
        const definition = dataSource.definitions.find(d => d.id === job.dataSourceId);
        if (!definition) return;

        const context = { hostname: definition.host, timestamp: new Date() };
        const fileName = processTemplate(job.fileNamePattern, context);
        const fileContent = processTemplate(job.fileContent, context);
        writeFile(definition.host, definition.path, fileName, fileContent);
      }
    });
  };

  const safeListFiles = (host: string, path: string) => {
    try {
      return listFiles(host, path);
    } catch {
      return [];
    }
  };

  const sourceStorages = dataSource.definitions.map(d => ({
    name: d.name,
    host: d.host,
    path: d.path,
    type: 'source'
  }));

  const topicStorages = topics.map(t => ({
    name: t.name,
    host: 'localhost',
    path: `/topics/${t.id}`,
    type: 'topic'
  }));

  const incomingPaths = new Set<string>();
  const incomingStorages: { name?: string, host: string, path: string, type: 'incoming' }[] = [];
  collection.jobs.forEach(job => {
    if (job.targetType === 'topic') return;
    const key = `${job.targetHost}:${job.targetPath}`;
    if (!incomingPaths.has(key)) {
      incomingPaths.add(key);
      incomingStorages.push({ host: job.targetHost, path: job.targetPath, type: 'incoming' });
    }
  });

  const internalPaths = new Set<string>();
  const internalStorages: { name?: string, host: string, path: string, type: 'internal' }[] = [];
  delivery.jobs.forEach(job => {
    const key = `${job.targetHost}:${job.targetPath}`;
    if (!internalPaths.has(key)) {
      internalPaths.add(key);
      internalStorages.push({ host: job.targetHost, path: job.targetPath, type: 'internal' });
    }
  });

  return (
    <div className="p-4 bg-white rounded shadow space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <Activity className="w-5 h-5" /> Simulation Control
      </h2>

      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded text-sm flex flex-col gap-1">
          <div className="font-bold flex items-center gap-1"><AlertTriangle size={14} /> Errors Detected:</div>
          <ul className="list-disc list-inside">
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
          <button onClick={() => setErrors([])} className="text-xs text-red-500 hover:underline self-end">Clear</button>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {/* All Start/Stop */}
        <button
          onClick={() => {
            const allRunning = isGeneratorRunning && isTransferRunning && isMappingRunning;
            setIsGeneratorRunning(!allRunning);
            setIsTransferRunning(!allRunning);
            setIsMappingRunning(!allRunning);
          }}
          className={`flex items-center gap-2 px-3 py-2 rounded transition-colors text-sm ${isGeneratorRunning && isTransferRunning && isMappingRunning
              ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
              : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200'
            }`}
        >
          {isGeneratorRunning && isTransferRunning && isMappingRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          All
        </button>

        {/* Generator Toggle */}
        <button
          onClick={() => setIsGeneratorRunning(!isGeneratorRunning)}
          className={`flex items-center gap-2 px-3 py-2 rounded transition-colors text-sm ${isGeneratorRunning
              ? 'bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
            }`}
        >
          {isGeneratorRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          Generate
        </button>

        {/* Transfer Toggle */}
        <button
          onClick={() => setIsTransferRunning(!isTransferRunning)}
          className={`flex items-center gap-2 px-3 py-2 rounded transition-colors text-sm ${isTransferRunning
              ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
            }`}
        >
          {isTransferRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          Transfer
        </button>

        {/* Mapping Toggle */}
        <button
          onClick={() => setIsMappingRunning(!isMappingRunning)}
          className={`flex items-center gap-2 px-3 py-2 rounded transition-colors text-sm ${isMappingRunning
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
            }`}
        >
          {isMappingRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          Mapping
        </button>

        <button
          onClick={handleCreateSourceFile}
          className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition-colors text-sm"
        >
          <FilePlus className="w-4 h-4" />
          Create Source File
        </button>
      </div>

      <div className="space-y-4">
        {/* Source Storages */}
        <div className="border p-3 rounded bg-gray-50">
          <h3 className="font-bold border-b mb-3 text-gray-700 flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Source Storages
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {sourceStorages.map(s => (
              <StorageView
                key={`${s.host}:${s.path}`}
                {...s}
                files={safeListFiles(s.host, s.path)}
              />
            ))}
            {sourceStorages.length === 0 && <span className="text-gray-400 italic text-xs">No source storages configured</span>}
          </div>
        </div>

        {/* Intermediate Storages (Topics & Incoming) */}
        <div className="border p-3 rounded bg-gray-50">
          <h3 className="font-bold border-b mb-3 text-gray-700 flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
            Intermediate Storages (Topics & Incoming)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {topicStorages.map(s => (
              <StorageView
                key={`topic-${s.name}`}
                {...s}
                files={safeListFiles(s.host, s.path)}
              />
            ))}
            {incomingStorages.map(s => (
              <StorageView
                key={`${s.host}:${s.path}`}
                {...s}
                files={safeListFiles(s.host, s.path)}
              />
            ))}
            {topicStorages.length === 0 && incomingStorages.length === 0 && <span className="text-gray-400 italic text-xs">No intermediate storages</span>}
          </div>
        </div>

        {/* Internal Storages */}
        <div className="border p-3 rounded bg-gray-50">
          <h3 className="font-bold border-b mb-3 text-gray-700 flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Internal Storages
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {internalStorages.map(s => (
              <StorageView
                key={`${s.host}:${s.path}`}
                {...s}
                files={safeListFiles(s.host, s.path)}
              />
            ))}
            {internalStorages.length === 0 && <span className="text-gray-400 italic text-xs">No internal storages</span>}
          </div>
        </div>

        {/* Database Status */}
        <div className="border p-3 rounded bg-gray-50">
          <div className="flex justify-between items-center mb-3 border-b pb-2">
            <h3 className="font-bold text-gray-700 flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-gray-600"></span>
              Database Status
            </h3>
            <div className="flex bg-white rounded border p-0.5">
              <button
                onClick={() => setDbViewMode('text')}
                className={`p-1 rounded ${dbViewMode === 'text' ? 'bg-gray-200 text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
                title="Text View"
              >
                <List size={14} />
              </button>
              <button
                onClick={() => setDbViewMode('table')}
                className={`p-1 rounded ${dbViewMode === 'table' ? 'bg-gray-200 text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
                title="Table View"
              >
                <Grid3X3 size={14} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tables.map(table => {
              const records = select(table.name);
              return (
                <div key={table.id} className="text-xs border border-gray-200 p-2 rounded bg-white shadow-sm flex flex-col">
                  <h4 className="font-semibold text-gray-700 mb-1 truncate" title={table.name}>{table.name}</h4>
                  <div className="h-48 overflow-auto bg-gray-50 p-1 rounded-sm border border-gray-100 flex-grow relative">
                    {dbViewMode === 'text' ? (
                      records.length === 0 ? (
                        <span className="text-gray-400 italic text-[10px]">No records</span>
                      ) : (
                        <ul className="space-y-1">
                          {records.map(r => <li key={r.id} className="truncate text-[11px] font-mono">{JSON.stringify(r.data)}</li>)}
                        </ul>
                      )
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-100 sticky top-0">
                          <tr>
                            {table.columns.length > 0 ? (
                              table.columns.map(col => (
                                <th key={col.name} className="p-1 border-b border-gray-200 font-medium text-gray-600 whitespace-nowrap">{col.name}</th>
                              ))
                            ) : (
                              Object.keys(records[0]?.data as object || {}).map(key => (
                                <th key={key} className="p-1 border-b border-gray-200 font-medium text-gray-600 whitespace-nowrap">{key}</th>
                              ))
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {records.length === 0 ? (
                            <tr>
                              <td colSpan={table.columns.length || 1} className="p-2 text-center text-gray-400 italic text-xs">No records</td>
                            </tr>
                          ) : (
                            records.map((r, i) => (
                              <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                {table.columns.length > 0 ? (
                                  table.columns.map(col => (
                                    <td key={col.name} className="p-1 border-b border-gray-100 truncate max-w-[150px]" title={String((r.data as any)[col.name] ?? '')}>
                                      {String((r.data as any)[col.name] ?? '')}
                                    </td>
                                  ))
                                ) : (
                                  Object.keys(records[0]?.data as object || {}).map(key => (
                                    <td key={key} className="p-1 border-b border-gray-100 truncate max-w-[150px]" title={String((r.data as any)[key] ?? '')}>
                                      {String((r.data as any)[key] ?? '')}
                                    </td>
                                  ))
                                )}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              );
            })}
            {tables.length === 0 && <span className="text-gray-400 italic text-xs">No tables defined</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

interface DashboardProps {
  processedFilesRef: React.MutableRefObject<Set<string>>;
}

const Dashboard: React.FC<DashboardProps> = ({ processedFilesRef }) => {
  const [activeSteps, setActiveSteps] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'simulation' | 'settings' | 'monitor'>('simulation');
  const { saveSettings } = useSettings();
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSave = () => {
    const result = saveSettings();
    if (result.success) {
      setSaveMessage({ type: 'success', text: 'Settings saved successfully.' });
      setTimeout(() => setSaveMessage(null), 3000);
    } else {
      setSaveMessage({ type: 'error', text: 'Failed to save settings. Please fix the errors highlighted below.' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">
          Data Pipeline Simulator
        </h1>
        <div className="flex bg-white rounded-lg shadow p-1">
          <button
            onClick={() => setActiveTab('simulation')}
            className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${activeTab === 'simulation' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
              }`}
          >
            <Activity className="w-4 h-4" /> Simulation
          </button>
          <button
            onClick={() => setActiveTab('monitor')}
            className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${activeTab === 'monitor' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
              }`}
          >
            <MonitorPlay className="w-4 h-4" /> Monitor
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${activeTab === 'settings' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
              }`}
          >
            <Settings className="w-4 h-4" /> Settings
          </button>
        </div>
      </div>

      {/* Simulation View - Always rendered to keep simulation running, hidden when not active */}
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 h-full ${activeTab === 'simulation' ? '' : 'hidden'}`}>
        <div className="flex flex-col gap-4">
          <SimulationControl
            activeSteps={activeSteps}
            setActiveSteps={setActiveSteps}
            processedFilesRef={processedFilesRef}
          />
        </div>
        <div className="h-[600px] bg-white rounded shadow border border-gray-200 overflow-hidden">
          <PipelineFlow activeSteps={activeSteps} />
        </div>
      </div>

      {activeTab === 'monitor' && (
        <div className="h-[calc(100vh-140px)]">
          <JobMonitor />
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white rounded shadow p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="w-6 h-6" /> Pipeline Configuration
            </h2>
            <button
              onClick={handleSave}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors shadow-sm"
            >
              Save Settings
            </button>
          </div>
          {saveMessage && (
            <div className={`mb-4 p-3 rounded border text-sm ${saveMessage.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
              }`}>
              {saveMessage.text}
            </div>
          )}
          <SettingsPanel />
        </div>
      )}
    </div>
  );
};

function App() {
  const processedFilesRef = useRef<Set<string>>(new Set());

  return (
    <SettingsProvider>
      <VirtualDBProvider>
        <FileSystemProvider>
          <JobMonitorProvider>
            <Dashboard processedFilesRef={processedFilesRef} />
          </JobMonitorProvider>
        </FileSystemProvider>
      </VirtualDBProvider>
    </SettingsProvider>
  );
}

export default App;
