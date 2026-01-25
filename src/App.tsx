import React, { useState } from 'react';
import { FileSystemProvider, useFileSystem } from './lib/VirtualFileSystem';
import { VirtualDBProvider, useVirtualDB } from './lib/VirtualDB';
import { SettingsProvider, useSettings } from './lib/SettingsContext';
import PipelineFlow from './components/PipelineFlow';
import DataSourceSettings from './components/settings/DataSourceSettings';
import CollectionSettings from './components/settings/CollectionSettings';
import DeliverySettings from './components/settings/DeliverySettings';
import EtlSettings from './components/settings/EtlSettings';
import 'reactflow/dist/style.css';
import { Settings, Play, Activity } from 'lucide-react';

interface SimulationControlProps {
  onStepChange: (step: string) => void;
}

const SimulationControl: React.FC<SimulationControlProps> = ({ onStepChange }) => {
  const { writeFile, moveFile, listFiles, deleteFile } = useFileSystem();
  const { insert, select } = useVirtualDB();
  const { dataSource, collection, delivery, etl } = useSettings();

  const handleRunSimulation = async () => {
    // 1. Source: Generate File
    // We write to collection.sourcePath as that is where collection starts
    const fileName = `${dataSource.filePrefix}${Date.now()}.csv`;
    writeFile(collection.sourcePath, fileName, dataSource.fileContent);

    // Start Transfer 1
    onStepChange('transfer_1');

    // Helper for delay
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    await delay(collection.processingTime);
    // 2. Collection
    moveFile(fileName, collection.sourcePath, collection.targetPath);
    // Start Transfer 2
    onStepChange('transfer_2');

    await delay(delivery.processingTime);
    // 3. Distribution
    moveFile(fileName, delivery.sourcePath, delivery.targetPath);
    // Start ETL
    onStepChange('process_etl');

    await delay(etl.processingTime);
    // 4. ETL & Load
    // Assuming ETL reads from delivery.targetPath
    insert(etl.rawTableName, { file: fileName, content: dataSource.fileContent });
    deleteFile(fileName, delivery.targetPath);
    // Start Transform
    onStepChange('process_transform');

    await delay(etl.processingTime);
    // 5. Transform
    insert(etl.summaryTableName, { source: fileName, summary: 'processed', value: Math.floor(Math.random() * 100) });
    // Finish
    onStepChange('');
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
        <Play className="w-5 h-5" /> Simulation Control
      </h2>
      <button
        onClick={handleRunSimulation}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors w-full sm:w-auto"
      >
        Generate File & Run Pipeline
      </button>

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
  const [activeStep, setActiveStep] = useState<string>('');
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
            <SimulationControl onStepChange={setActiveStep} />
          </div>
          <div className="h-[600px] bg-white rounded shadow border border-gray-200 overflow-hidden">
             <PipelineFlow activeStep={activeStep} />
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
