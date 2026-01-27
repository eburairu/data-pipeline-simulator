import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FileSystemProvider, useFileSystem, type VFile } from './lib/VirtualFileSystem';
import { VirtualDBProvider, useVirtualDB } from './lib/VirtualDB';
import { SettingsProvider, useSettings } from './lib/SettingsContext';
import PipelineFlow from './components/PipelineFlow';
import DataSourceSettings from './components/settings/DataSourceSettings';
import CollectionSettings from './components/settings/CollectionSettings';
import DeliverySettings from './components/settings/DeliverySettings';
import TopicSettings from './components/settings/TopicSettings';
import EtlSettings from './components/settings/EtlSettings';
import InfrastructureSettings from './components/settings/InfrastructureSettings';
import { processTemplate } from './lib/templateUtils';
import 'reactflow/dist/style.css';
import { Settings, Play, Pause, Activity, FilePlus, AlertTriangle } from 'lucide-react';

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
  // 帯域幅: 1秒あたりの文字数
  // コンテンツ長: 文字数
  //転送時間 = (長さ / 帯域幅) * 1000 ms
  // 合計時間 = 転送時間 + レイテンシ
  const safeBandwidth = Math.max(0.1, bandwidth); // ゼロ除算を防止
  const transferTime = (content.length / safeBandwidth) * 1000;
  return transferTime + latency;
};

const SimulationControl: React.FC<SimulationControlProps> = ({ setActiveSteps, processedFilesRef }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const { writeFile, moveFile, listFiles, deleteFile } = useFileSystem();
  const { insert, select } = useVirtualDB();
  const { dataSource, collection, delivery, etl, topics } = useSettings();

  // interval内で現在の状態にアクセスするためのRef
  const listFilesRef = useRef(listFiles);
  const selectRef = useRef(select);

  useEffect(() => {
    listFilesRef.current = listFiles;
  }, [listFiles]);

  useEffect(() => {
    selectRef.current = select;
  }, [select]);

  // ロック
  const collectionLocks = useRef<Record<string, boolean>>({});
  const deliveryLocks = useRef<Record<string, boolean>>({});
  const etlLock = useRef(false);
  const transformLock = useRef(false);

  // ファイルロック (排他制御用)
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

  // ステップのアクティブ状態を切り替えるヘルパー
  const toggleStep = useCallback((step: string, active: boolean) => {
    setActiveSteps(prev => {
      if (active) {
        return prev.includes(step) ? prev : [...prev, step];
      } else {
        return prev.filter(s => s !== step);
      }
    });
  }, [setActiveSteps]);

  // 遅延用のヘルパー
  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  // --- 自動実行のエフェクト ---

  // 1. ソース生成
  useEffect(() => {
    if (!isRunning) return;
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
  }, [isRunning, dataSource.jobs, dataSource.definitions, writeFile]);

  // 2. 収集 (Source -> Incoming OR Topic)
  useEffect(() => {
    const timers: ReturnType<typeof setInterval>[] = [];

    collection.jobs.forEach(job => {
      if (!job.enabled) return;

      const timer = setInterval(async () => {
        // ジョブの再入防止
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

          // ロックされていないファイルを探す
          const file = currentFiles.find(f => regex.test(f.name) && !isFileLocked(job.sourceHost, job.sourcePath, f.name));
          if (!file) return;

          collectionLocks.current[job.id] = true;
          lockFile(job.sourceHost, job.sourcePath, file.name);

          toggleStep(`transfer_1_${job.id}`, true);

          try {
            const processingTime = calculateProcessingTime(file.content, job.bandwidth, collection.processingTime);
            await delay(processingTime);

            // Determine target
            let targetHost = job.targetHost;
            let targetPath = job.targetPath;

            if (job.targetType === 'topic' && job.targetTopicId) {
                 targetHost = 'localhost'; // Hub host
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
            } catch (e) {
               setErrors(prev => {
                  const msg = `Collection Job ${job.name}: Failed to move to '${targetHost}:${targetPath}'`;
                  return prev.includes(msg) ? prev : [...prev, msg];
               });
            }
          } finally {
            unlockFile(job.sourceHost, job.sourcePath, file.name);
            toggleStep(`transfer_1_${job.id}`, false);
            collectionLocks.current[job.id] = false;
          }
        } catch (e) {
           // 読み取りエラー（空のパスなど）を無視
           if (collectionLocks.current[job.id]) {
             collectionLocks.current[job.id] = false;
           }
        }
      }, job.executionInterval);

      timers.push(timer);
    });

    return () => timers.forEach(clearInterval);
  }, [collection.jobs, collection.processingTime, moveFile, toggleStep]);

  // 3. 配信 (Incoming OR Topic -> Internal)
  useEffect(() => {
    const timers: ReturnType<typeof setInterval>[] = [];

    delivery.jobs.forEach(job => {
      if (!job.enabled) return;

      const timer = setInterval(async () => {
        // ジョブの再入防止
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

          // Topicの場合は処理済みを除外
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

          // ロックされていないファイルを探す
          const file = currentFiles.find(f => regex.test(f.name) && !isFileLocked(sourceHost, sourcePath, f.name));
          if (!file) return;

          deliveryLocks.current[job.id] = true;
          lockFile(sourceHost, sourcePath, file.name);

          toggleStep(`transfer_2_${job.id}`, true);

          try {
            const processingTime = calculateProcessingTime(file.content, job.bandwidth, job.processingTime);
            await delay(processingTime);

            try {
              if (job.sourceType === 'topic') {
                 // Copy logic
                 writeFile(job.targetHost, job.targetPath, file.name, file.content);
                 processedFilesRef.current.add(`${job.id}:${file.name}`);
              } else {
                 moveFile(file.name, sourceHost, sourcePath, job.targetHost, job.targetPath);
              }
              setErrors(prev => prev.filter(e => !e.includes(`Delivery Job ${job.name}`)));
            } catch (e) {
              setErrors(prev => {
                  const msg = `Delivery Job ${job.name}: Failed to move/copy to '${job.targetHost}:${job.targetPath}'`;
                  return prev.includes(msg) ? prev : [...prev, msg];
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
  }, [delivery.jobs, moveFile, writeFile, toggleStep]);

  // 4. ETL & ロード (Delivery Target -> DB)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (etlLock.current) return;

      try {
        const currentFiles = listFilesRef.current(etl.sourceHost, etl.sourcePath);
        if (currentFiles.length === 0) return;

        // ロックされていないファイルを探す
        const file = currentFiles.find(f => !isFileLocked(etl.sourceHost, etl.sourcePath, f.name));
        if (!file) return;

        etlLock.current = true;
        lockFile(etl.sourceHost, etl.sourcePath, file.name);

        toggleStep('process_etl', true);

        try {
          // 以前のシミュレーション速度 (len * 10ms) に合わせるため、ETLのデフォルト帯域幅を 100文字/秒と仮定
          const processingTime = calculateProcessingTime(file.content, 100, etl.processingTime);
          await delay(processingTime);

          insert(etl.rawTableName, { file: file.name, content: file.content });
          deleteFile(etl.sourceHost, file.name, etl.sourcePath);
        } finally {
          unlockFile(etl.sourceHost, etl.sourcePath, file.name);
          toggleStep('process_etl', false);
          etlLock.current = false;
        }
      } catch (e) {
        if (etlLock.current) {
          etlLock.current = false;
        }
      }
    }, etl.executionInterval);
    return () => clearInterval(interval);
  }, [etl, insert, deleteFile, toggleStep]);

  // 5. 変換 (Raw DB -> Summary DB)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (transformLock.current) return;

      const summaryRecords = selectRef.current(etl.summaryTableName);
      const rawRecords = selectRef.current(etl.rawTableName);

      const lastProcessedTime = Math.max(0, ...summaryRecords.map(r => (r.data['lastProcessedTimestamp'] as number) || 0));
      const newRawRecords = rawRecords.filter(r => r.insertedAt > lastProcessedTime);

      if (newRawRecords.length === 0) return;

      transformLock.current = true;
      toggleStep('process_transform', true);

      const combinedContent = newRawRecords.map(r => r.data['content'] as string || '').join('');
      // 変換用にデフォルト帯域幅を 100文字/秒と仮定
      const processingTime = calculateProcessingTime(combinedContent, 100, etl.processingTime);
      await delay(processingTime);

      const currentMaxTime = Math.max(...newRawRecords.map(r => r.insertedAt));

      insert(etl.summaryTableName, {
        summary: 'processed_batch',
        count: newRawRecords.length,
        timestamp: Date.now(),
        lastProcessedTimestamp: currentMaxTime
      });

      toggleStep('process_transform', false);
      transformLock.current = false;
    }, etl.executionInterval);
    return () => clearInterval(interval);
  }, [etl, insert, toggleStep]);

  // 6. Retention Policy (Topic Cleanup)
  useEffect(() => {
      if (!isRunning) return;

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
  }, [isRunning, topics, deleteFile]);


  const handleCreateSourceFile = () => {
    // すべての有効なデータソースジョブに対してファイルを生成
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

  const dbRaw = select(etl.rawTableName);
  const dbSummary = select(etl.summaryTableName);

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
        <button
          onClick={() => setIsRunning(!isRunning)}
          className={`flex items-center gap-2 px-4 py-2 rounded transition-colors w-full sm:w-auto ${isRunning
              ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
              : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200'
            }`}
        >
          {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {isRunning ? 'Stop Auto-Run' : 'Start Auto-Run'}
        </button>

        <button
          onClick={handleCreateSourceFile}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors w-full sm:w-auto"
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
           <h3 className="font-bold border-b mb-3 text-gray-700 flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-gray-600"></span>
            Database Status
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="text-xs border border-gray-200 p-2 rounded bg-white shadow-sm flex flex-col">
              <h4 className="font-semibold text-gray-700 mb-1 truncate" title={`Raw: ${etl.rawTableName}`}>Raw: {etl.rawTableName}</h4>
              <ul className="space-y-1 h-32 overflow-y-auto bg-gray-50 p-1 rounded-sm border border-gray-100 flex-grow">
                {dbRaw.length === 0 && <li className="text-gray-400 italic text-[10px]">No records</li>}
                {dbRaw.map(r => <li key={r.id} className="truncate text-[11px] font-mono">{JSON.stringify(r.data)}</li>)}
              </ul>
            </div>
            <div className="text-xs border border-gray-200 p-2 rounded bg-white shadow-sm flex flex-col">
              <h4 className="font-semibold text-gray-700 mb-1 truncate" title={`Summary: ${etl.summaryTableName}`}>Summary: {etl.summaryTableName}</h4>
               <ul className="space-y-1 h-32 overflow-y-auto bg-gray-50 p-1 rounded-sm border border-gray-100 flex-grow">
                {dbSummary.length === 0 && <li className="text-gray-400 italic text-[10px]">No records</li>}
                {dbSummary.map(r => <li key={r.id} className="truncate text-[11px] font-mono">{JSON.stringify(r.data)}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingsPanel = () => {
  return (
    <div className="space-y-6">
      <InfrastructureSettings />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DataSourceSettings />
        <CollectionSettings />
        <TopicSettings />
        <DeliverySettings />
        <EtlSettings />
      </div>
    </div>
  );
};

interface DashboardProps {
  processedFilesRef: React.MutableRefObject<Set<string>>;
}

const Dashboard: React.FC<DashboardProps> = ({ processedFilesRef }) => {
  const [activeSteps, setActiveSteps] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'simulation' | 'settings'>('simulation');
  const { saveSettings } = useSettings();
  const [saveMessage, setSaveMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

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
            className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${
              activeTab === 'simulation' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Activity className="w-4 h-4" /> Simulation
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${
              activeTab === 'settings' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Settings className="w-4 h-4" /> Settings
          </button>
        </div>
      </div>

      {activeTab === 'simulation' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
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
      ) : (
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
            <div className={`mb-4 p-3 rounded border text-sm ${
              saveMessage.type === 'success'
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
          <Dashboard processedFilesRef={processedFilesRef} />
        </FileSystemProvider>
      </VirtualDBProvider>
    </SettingsProvider>
  );
}

export default App;
