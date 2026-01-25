import React, { useState, useEffect, useRef } from 'react';
import { FileSystemProvider, useFileSystem } from './lib/VirtualFileSystem';
import { VirtualDBProvider, useVirtualDB } from './lib/VirtualDB';
import { SettingsProvider, useSettings } from './lib/SettingsContext';
import PipelineFlow from './components/PipelineFlow';
import DataSourceSettings from './components/settings/DataSourceSettings';
import CollectionSettings from './components/settings/CollectionSettings';
import DeliverySettings from './components/settings/DeliverySettings';
import EtlSettings from './components/settings/EtlSettings';
import 'reactflow/dist/style.css';
import { Settings, Play, Pause, Activity, RefreshCw } from 'lucide-react';

interface SimulationControlProps {
  activeSteps: string[];
  setActiveSteps: React.Dispatch<React.SetStateAction<string[]>>;
}

const SimulationControl: React.FC<SimulationControlProps> = ({ setActiveSteps }) => {
  const [isRunning, setIsRunning] = useState(false);
  const { writeFile, moveFile, listFiles, deleteFile } = useFileSystem();
  const { insert, select } = useVirtualDB();
  const { dataSource, collection, delivery, etl } = useSettings();

  // Locks for auto-run to prevent overlapping processing in the same stage
  const collectionLock = useRef(false);
  const deliveryLock = useRef(false);
  const etlLock = useRef(false);
  const transformLock = useRef(false);

  // Helper to toggle step active state
  const toggleStep = (step: string, active: boolean) => {
    setActiveSteps(prev => {
      if (active) {
        return prev.includes(step) ? prev : [...prev, step];
      } else {
        return prev.filter(s => s !== step);
      }
    });
  };

  // Helper for delay
  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  // --- Auto Run Effects ---

  // 1. Source Generation
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      const fileName = `${dataSource.filePrefix}${Date.now()}.csv`;
      writeFile(collection.sourcePath, fileName, dataSource.fileContent);
    }, dataSource.executionInterval);
    return () => clearInterval(interval);
  }, [isRunning, dataSource, collection.sourcePath, writeFile]);

  // 2. Collection (Source -> Target)
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(async () => {
      if (collectionLock.current) return;

      const files = listFiles(collection.sourcePath);
      if (files.length === 0) return;

      collectionLock.current = true;
      const file = files[0];

      toggleStep('transfer_1', true);
      await delay(collection.processingTime);

      moveFile(file.name, collection.sourcePath, collection.targetPath);
      toggleStep('transfer_1', false);
      collectionLock.current = false;
    }, collection.executionInterval);
    return () => clearInterval(interval);
  }, [isRunning, collection, listFiles, moveFile]);

  // 3. Delivery (Collection Target -> Delivery Target)
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(async () => {
      if (deliveryLock.current) return;

      const files = listFiles(delivery.sourcePath);
      if (files.length === 0) return;

      deliveryLock.current = true;
      const file = files[0];

      toggleStep('transfer_2', true);
      await delay(delivery.processingTime);

      moveFile(file.name, delivery.sourcePath, delivery.targetPath);
      toggleStep('transfer_2', false);
      deliveryLock.current = false;
    }, delivery.executionInterval);
    return () => clearInterval(interval);
  }, [isRunning, delivery, listFiles, moveFile]);

  // 4. ETL & Load (Delivery Target -> DB)
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(async () => {
      if (etlLock.current) return;

      const files = listFiles(delivery.targetPath);
      if (files.length === 0) return;

      etlLock.current = true;
      const file = files[0];

      toggleStep('process_etl', true);
      await delay(etl.processingTime);

      insert(etl.rawTableName, { file: file.name, content: dataSource.fileContent });
      deleteFile(file.name, delivery.targetPath);

      toggleStep('process_etl', false);
      etlLock.current = false;
    }, etl.executionInterval);
    return () => clearInterval(interval);
  }, [isRunning, etl, delivery.targetPath, listFiles, insert, deleteFile, dataSource.fileContent]);

  // 5. Transform (Raw DB -> Summary DB)
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(async () => {
      if (transformLock.current) return;

      // In a real scenario we'd check for unprocessed records.
      // Here we just simulate a transform job running periodically if there is data.
      const rawRecords = select(etl.rawTableName);
      if (rawRecords.length === 0) return;

      transformLock.current = true;

      toggleStep('process_transform', true);
      await delay(etl.processingTime);

      // Simulate aggregation
      insert(etl.summaryTableName, {
        summary: 'processed_batch',
        count: rawRecords.length,
        timestamp: Date.now()
      });

      toggleStep('process_transform', false);
      transformLock.current = false;
    }, etl.executionInterval); // Using same interval as ETL for simplicity or add transform settings
    return () => clearInterval(interval);
  }, [isRunning, etl, select, insert]);


  const handleRunSimulation = async () => {
    // 1. Source: Generate File
    const fileName = `${dataSource.filePrefix}${Date.now()}.csv`;
    writeFile(collection.sourcePath, fileName, dataSource.fileContent);

    // Start Transfer 1
    toggleStep('transfer_1', true);
    await delay(collection.processingTime);
    moveFile(fileName, collection.sourcePath, collection.targetPath);
    toggleStep('transfer_1', false);

    // Start Transfer 2
    toggleStep('transfer_2', true);
    await delay(delivery.processingTime);
    moveFile(fileName, delivery.sourcePath, delivery.targetPath);
    toggleStep('transfer_2', false);

    // Start ETL
    toggleStep('process_etl', true);
    await delay(etl.processingTime);
    insert(etl.rawTableName, { file: fileName, content: dataSource.fileContent });
    deleteFile(fileName, delivery.targetPath);
    toggleStep('process_etl', false);

    // Start Transform
    toggleStep('process_transform', true);
    await delay(etl.processingTime);
    insert(etl.summaryTableName, { source: fileName, summary: 'processed', value: Math.floor(Math.random() * 100) });
    toggleStep('process_transform', false);
  };

  const sourceFiles = listFiles(collection.sourcePath);
  const incomingFiles = listFiles(collection.targetPath);
  // delivery.sourcePath is usually collection.targetPath, but listed separately just in case
  const internalFiles = listFiles(delivery.targetPath);

  const dbRaw = select(etl.rawTableName);
  const dbSummary = select(etl.summaryTableName);

  return (
    <div className="p-4 bg-white rounded shadow space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <Activity className="w-5 h-5" /> Simulation Control
      </h2>

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
          onClick={handleRunSimulation}
          disabled={isRunning}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className="w-4 h-4" />
          One-time Run
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="border p-2 rounded bg-gray-50">
          <h3 className="font-bold border-b mb-2 text-gray-700 break-all">{collection.sourcePath}</h3>
          <ul className="space-y-1">
            {sourceFiles.length === 0 && <li className="text-gray-400 italic">Empty</li>}
            {sourceFiles.map(f => <li key={f.createdAt} className="text-green-600 truncate">{f.name}</li>)}
          </ul>
        </div>
        <div className="border p-2 rounded bg-gray-50">
          <h3 className="font-bold border-b mb-2 text-gray-700 break-all">{collection.targetPath}</h3>
           <ul className="space-y-1">
            {incomingFiles.length === 0 && <li className="text-gray-400 italic">Empty</li>}
            {incomingFiles.map(f => <li key={f.createdAt} className="text-orange-600 truncate">{f.name}</li>)}
          </ul>
        </div>
        <div className="border p-2 rounded bg-gray-50">
          <h3 className="font-bold border-b mb-2 text-gray-700 break-all">{delivery.targetPath}</h3>
           <ul className="space-y-1">
            {internalFiles.length === 0 && <li className="text-gray-400 italic">Empty</li>}
            {internalFiles.map(f => <li key={f.createdAt} className="text-blue-600 truncate">{f.name}</li>)}
          </ul>
        </div>
      </div>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-4">
        <div className="border p-2 rounded bg-gray-50">
          <h3 className="font-bold border-b mb-2 text-gray-700">DB: {etl.rawTableName}</h3>
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
