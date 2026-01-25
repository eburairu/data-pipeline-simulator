import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FileSystemProvider, useFileSystem } from './lib/VirtualFileSystem';
import { VirtualDBProvider, useVirtualDB } from './lib/VirtualDB';
import { SettingsProvider, useSettings } from './lib/SettingsContext';
import PipelineFlow from './components/PipelineFlow';
import DataSourceSettings from './components/settings/DataSourceSettings';
import CollectionSettings from './components/settings/CollectionSettings';
import DeliverySettings from './components/settings/DeliverySettings';
import EtlSettings from './components/settings/EtlSettings';
import 'reactflow/dist/style.css';
import { Settings, Play, Pause, Activity, FilePlus, AlertTriangle } from 'lucide-react';

interface SimulationControlProps {
  activeSteps: string[];
  setActiveSteps: React.Dispatch<React.SetStateAction<string[]>>;
}

const generateFileName = (prefix: string) => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');

  const highResTime = performance.timeOrigin + performance.now();
  const microSeconds = Math.floor((highResTime % 1000) * 1000);

  return `${prefix}${yyyy}${mm}${dd}${hh}${mi}${ss}.${microSeconds}.csv`;
};

const calculateProcessingTime = (content: string, baseTime: number) => {
  // Base time + 10ms per character as a simulation of size-based processing
  return baseTime + (content.length * 10);
};

const SimulationControl: React.FC<SimulationControlProps> = ({ setActiveSteps }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const { writeFile, moveFile, listFiles, deleteFile } = useFileSystem();
  const { insert, select } = useVirtualDB();
  const { dataSource, collection, delivery, etl } = useSettings();

  // Refs for current state access inside intervals
  const listFilesRef = useRef(listFiles);
  const selectRef = useRef(select);

  useEffect(() => {
    listFilesRef.current = listFiles;
  }, [listFiles]);

  useEffect(() => {
    selectRef.current = select;
  }, [select]);

  // Locks
  const collectionLocks = useRef<Record<string, boolean>>({});
  const deliveryLocks = useRef<Record<string, boolean>>({});
  const etlLock = useRef(false);
  const transformLock = useRef(false);

  // Helper to toggle step active state
  const toggleStep = useCallback((step: string, active: boolean) => {
    setActiveSteps(prev => {
      if (active) {
        return prev.includes(step) ? prev : [...prev, step];
      } else {
        return prev.filter(s => s !== step);
      }
    });
  }, [setActiveSteps]);

  // Helper for delay
  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  // --- Auto Run Effects ---

  // 1. Source Generation
  useEffect(() => {
    if (!isRunning) return;
    const timers: ReturnType<typeof setInterval>[] = [];

    dataSource.jobs.forEach(job => {
      if (!job.enabled) return;

      const timer = setInterval(() => {
        const fileName = generateFileName(job.filePrefix);
        writeFile(job.sourcePath, fileName, job.fileContent);
      }, job.executionInterval);
      timers.push(timer);
    });

    return () => timers.forEach(clearInterval);
  }, [isRunning, dataSource.jobs, writeFile]);

  // 2. Collection (Source -> Incoming)
  useEffect(() => {
    const timers: ReturnType<typeof setInterval>[] = [];

    collection.jobs.forEach(job => {
      if (!job.enabled) return;

      const timer = setInterval(async () => {
        // Simple Mutex for Collection Stage to prevent race conditions on shared paths
        if (Object.values(collectionLocks.current).some(isActive => isActive)) return;

        try {
          const currentFiles = listFilesRef.current(job.sourcePath);
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

          const file = currentFiles.find(f => regex.test(f.name));
          if (!file) return;

          if (Object.values(collectionLocks.current).some(isActive => isActive)) return;

          collectionLocks.current[job.id] = true;

          toggleStep(`transfer_1_${job.id}`, true);

          const processingTime = calculateProcessingTime(file.content, collection.processingTime);
          await delay(processingTime);

          try {
             moveFile(file.name, job.sourcePath, job.targetPath);
             setErrors(prev => prev.filter(e => !e.includes(`Collection Job ${job.name}`)));
          } catch (e) {
             setErrors(prev => {
                const msg = `Collection Job ${job.name}: Failed to move to '${job.targetPath}'`;
                return prev.includes(msg) ? prev : [...prev, msg];
             });
          }

          toggleStep(`transfer_1_${job.id}`, false);
          collectionLocks.current[job.id] = false;
        } catch (e) {
           // Ignore read errors (empty path etc)
           collectionLocks.current[job.id] = false;
        }
      }, job.executionInterval);

      timers.push(timer);
    });

    return () => timers.forEach(clearInterval);
  }, [collection.jobs, collection.processingTime, moveFile, toggleStep]);

  // 3. Delivery (Incoming -> Internal)
  useEffect(() => {
    const timers: ReturnType<typeof setInterval>[] = [];

    delivery.jobs.forEach(job => {
      if (!job.enabled) return;

      const timer = setInterval(async () => {
        if (Object.values(deliveryLocks.current).some(isActive => isActive)) return;

        try {
          const currentFiles = listFilesRef.current(job.sourcePath);
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

          const file = currentFiles.find(f => regex.test(f.name));
          if (!file) return;

          if (Object.values(deliveryLocks.current).some(isActive => isActive)) return;

          deliveryLocks.current[job.id] = true;
          toggleStep(`transfer_2_${job.id}`, true);

          const processingTime = calculateProcessingTime(file.content, job.processingTime);
          await delay(processingTime);

          try {
            moveFile(file.name, job.sourcePath, job.targetPath);
            setErrors(prev => prev.filter(e => !e.includes(`Delivery Job ${job.name}`)));
          } catch (e) {
            setErrors(prev => {
                const msg = `Delivery Job ${job.name}: Failed to move to '${job.targetPath}'`;
                return prev.includes(msg) ? prev : [...prev, msg];
             });
          }

          toggleStep(`transfer_2_${job.id}`, false);
          deliveryLocks.current[job.id] = false;
        } catch (e) {
          deliveryLocks.current[job.id] = false;
        }
      }, job.executionInterval);

      timers.push(timer);
    });
    return () => timers.forEach(clearInterval);
  }, [delivery.jobs, moveFile, toggleStep]);

  // 4. ETL & Load (Delivery Target -> DB)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (etlLock.current) return;

      try {
        const currentFiles = listFilesRef.current(etl.sourcePath);
        if (currentFiles.length === 0) return;

        etlLock.current = true;
        const file = currentFiles[0];

        toggleStep('process_etl', true);

        const processingTime = calculateProcessingTime(file.content, etl.processingTime);
        await delay(processingTime);

        insert(etl.rawTableName, { file: file.name, content: file.content });
        deleteFile(file.name, etl.sourcePath);

        toggleStep('process_etl', false);
        etlLock.current = false;
      } catch (e) {
        etlLock.current = false;
      }
    }, etl.executionInterval);
    return () => clearInterval(interval);
  }, [etl, insert, deleteFile, toggleStep]);

  // 5. Transform (Raw DB -> Summary DB)
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
      const processingTime = calculateProcessingTime(combinedContent, etl.processingTime);
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


  const handleCreateSourceFile = () => {
    // Generate file for ALL enabled data source jobs
    dataSource.jobs.forEach(job => {
        if (job.enabled) {
            const fileName = generateFileName(job.filePrefix);
            writeFile(job.sourcePath, fileName, job.fileContent);
        }
    });
  };

  const safeListFiles = (path: string) => {
    try {
      return listFiles(path);
    } catch {
      return [];
    }
  };

  const dbRaw = select(etl.rawTableName);
  const dbSummary = select(etl.summaryTableName);

  return (
    <div className="p-4 bg-white rounded shadow space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <Activity className="w-5 h-5" /> Simulation Control
      </h2>

      {errors.length > 0 && (
         <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded text-sm flex flex-col gap-1">
            <div className="font-bold flex items-center gap-1"><AlertTriangle size={14}/> Errors Detected:</div>
            <ul className="list-disc list-inside">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
            <button onClick={() => setErrors([])} className="text-xs text-red-500 hover:underline self-end">Clear</button>
         </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setIsRunning(!isRunning)}
          className={`flex items-center gap-2 px-4 py-2 rounded transition-colors w-full sm:w-auto ${
            isRunning
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        {/* Source Files (grouped by DS Job) */}
        <div className="border p-2 rounded bg-gray-50 flex flex-col gap-2">
           <h3 className="font-bold border-b text-gray-700">Sources</h3>
           {dataSource.jobs.map(job => (
              <div key={job.id} className="text-xs">
                 <div className="font-semibold text-gray-600">{job.name} ({job.sourcePath})</div>
                 <ul className="pl-2">
                   {safeListFiles(job.sourcePath).map(f => (
                     <li key={f.name} className="text-green-600 truncate">{f.name}</li>
                   ))}
                   {safeListFiles(job.sourcePath).length === 0 && <span className="text-gray-400 italic">Empty</span>}
                 </ul>
              </div>
           ))}
        </div>

        {/* Collection/Incoming Files (grouped by Collection Job) */}
        <div className="border p-2 rounded bg-gray-50 flex flex-col gap-2">
            <h3 className="font-bold border-b text-gray-700">Collection / Incoming</h3>
            {collection.jobs.map(job => (
              <div key={job.id} className="text-xs">
                 <div className="font-semibold text-gray-600">{job.name} → {job.targetPath}</div>
                 <ul className="pl-2">
                   {safeListFiles(job.targetPath).map(f => (
                     <li key={f.name} className="text-orange-600 truncate">{f.name}</li>
                   ))}
                   {safeListFiles(job.targetPath).length === 0 && <span className="text-gray-400 italic">Empty</span>}
                 </ul>
              </div>
            ))}
        </div>

        {/* Delivery/Internal Files (grouped by Delivery Job) */}
        <div className="border p-2 rounded bg-gray-50 flex flex-col gap-2">
            <h3 className="font-bold border-b text-gray-700">Delivery / Internal</h3>
            {delivery.jobs.map(job => (
              <div key={job.id} className="text-xs">
                 <div className="font-semibold text-gray-600">{job.name} → {job.targetPath}</div>
                 <ul className="pl-2">
                   {safeListFiles(job.targetPath).map(f => (
                     <li key={f.name} className="text-blue-600 truncate">{f.name}</li>
                   ))}
                   {safeListFiles(job.targetPath).length === 0 && <span className="text-gray-400 italic">Empty</span>}
                 </ul>
              </div>
            ))}
        </div>
      </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-4">
        <div className="border p-2 rounded bg-gray-50">
          <h3 className="font-bold border-b mb-2 text-gray-700">DB: {etl.rawTableName} (From: {etl.sourcePath})</h3>
          <ul className="space-y-1 h-32 overflow-y-auto">
            {dbRaw.length === 0 && <li className="text-gray-400 italic">No records</li>}
            {dbRaw.map(r => <li key={r.id} className="truncate">{JSON.stringify(r.data)}</li>)}
          </ul>
        </div>
        <div className="border p-2 rounded bg-gray-50">
          <h3 className="font-bold border-b mb-2 text-gray-700">DB: {etl.summaryTableName}</h3>
          <ul className="space-y-1 h-32 overflow-y-auto">
             {dbSummary.length === 0 && <li className="text-gray-400 italic">No records</li>}
            {dbSummary.map(r => <li key={r.id} className="truncate">{JSON.stringify(r.data)}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
};

const SettingsPanel = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DataSourceSettings />
        <CollectionSettings />
        <DeliverySettings />
        <EtlSettings />
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [activeSteps, setActiveSteps] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'simulation' | 'settings'>('simulation');

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
            <SimulationControl activeSteps={activeSteps} setActiveSteps={setActiveSteps} />
          </div>
          <div className="h-[600px] bg-white rounded shadow border border-gray-200 overflow-hidden">
             <PipelineFlow activeSteps={activeSteps} />
          </div>
        </div>
      ) : (
        <div className="bg-white rounded shadow p-6 border border-gray-200">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
             <Settings className="w-6 h-6" /> Pipeline Configuration
          </h2>
          <SettingsPanel />
        </div>
      )}
    </div>
  );
};

function App() {
  return (
    <SettingsProvider>
      <VirtualDBProvider>
        <FileSystemProvider>
          <Dashboard />
        </FileSystemProvider>
      </VirtualDBProvider>
    </SettingsProvider>
  );
}

export default App;
