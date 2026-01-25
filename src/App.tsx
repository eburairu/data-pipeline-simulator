import React, { useState } from 'react';
import { FileSystemProvider, useFileSystem } from './lib/VirtualFileSystem';
import { VirtualDBProvider, useVirtualDB } from './lib/VirtualDB';
import PipelineFlow from './components/PipelineFlow';
import 'reactflow/dist/style.css';

interface SimulationControlProps {
  onStepChange: (step: string) => void;
}

const SimulationControl: React.FC<SimulationControlProps> = ({ onStepChange }) => {
  const { writeFile, moveFile, listFiles, deleteFile } = useFileSystem();
  const { insert, select } = useVirtualDB();

  const handleRunSimulation = async () => {
    // 1. Source: Generate File
    const fileName = `data_${Date.now()}.csv`;
    writeFile('/source', fileName, 'sample,data,123');

    // Start Transfer 1
    onStepChange('transfer_1');

    // Helper for delay
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    await delay(1000);
    // 2. Collection
    moveFile(fileName, '/source', '/incoming');
    // Start Transfer 2
    onStepChange('transfer_2');

    await delay(1000);
    // 3. Distribution
    moveFile(fileName, '/incoming', '/internal');
    // Start ETL
    onStepChange('process_etl');

    await delay(1000);
    // 4. ETL & Load
    insert('raw_data', { file: fileName, content: 'sample,data,123' });
    deleteFile(fileName, '/internal');
    // Start Transform
    onStepChange('process_transform');

    await delay(1000);
    // 5. Transform
    insert('summary_data', { source: fileName, summary: 'processed', value: Math.floor(Math.random() * 100) });
    // Finish
    onStepChange('');
  };

  const sourceFiles = listFiles('/source');
  const incomingFiles = listFiles('/incoming');
  const internalFiles = listFiles('/internal');
  const dbRaw = select('raw_data');
  const dbSummary = select('summary_data');

  return (
    <div className="p-4 bg-white rounded shadow space-y-4">
      <h2 className="text-xl font-bold">Simulation Control</h2>
      <button
        onClick={handleRunSimulation}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
      >
        Generate File & Run Pipeline
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="border p-2 rounded bg-gray-50">
          <h3 className="font-bold border-b mb-2 text-gray-700">/source</h3>
          <ul className="space-y-1">
            {sourceFiles.length === 0 && <li className="text-gray-400 italic">Empty</li>}
            {sourceFiles.map(f => <li key={f.createdAt} className="text-green-600">{f.name}</li>)}
          </ul>
        </div>
        <div className="border p-2 rounded bg-gray-50">
          <h3 className="font-bold border-b mb-2 text-gray-700">/incoming</h3>
           <ul className="space-y-1">
            {incomingFiles.length === 0 && <li className="text-gray-400 italic">Empty</li>}
            {incomingFiles.map(f => <li key={f.createdAt} className="text-orange-600">{f.name}</li>)}
          </ul>
        </div>
        <div className="border p-2 rounded bg-gray-50">
          <h3 className="font-bold border-b mb-2 text-gray-700">/internal</h3>
           <ul className="space-y-1">
            {internalFiles.length === 0 && <li className="text-gray-400 italic">Empty</li>}
            {internalFiles.map(f => <li key={f.createdAt} className="text-blue-600">{f.name}</li>)}
          </ul>
        </div>
      </div>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-4">
        <div className="border p-2 rounded bg-gray-50">
          <h3 className="font-bold border-b mb-2 text-gray-700">DB: raw_data</h3>
          <ul className="space-y-1 h-32 overflow-y-auto">
            {dbRaw.length === 0 && <li className="text-gray-400 italic">No records</li>}
            {dbRaw.map(r => <li key={r.id} className="truncate">{JSON.stringify(r.data)}</li>)}
          </ul>
        </div>
        <div className="border p-2 rounded bg-gray-50">
          <h3 className="font-bold border-b mb-2 text-gray-700">DB: summary_data</h3>
          <ul className="space-y-1 h-32 overflow-y-auto">
             {dbSummary.length === 0 && <li className="text-gray-400 italic">No records</li>}
            {dbSummary.map(r => <li key={r.id} className="truncate">{JSON.stringify(r.data)}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [activeStep, setActiveStep] = useState<string>('');

  return (
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col gap-8">
      <h1 className="text-3xl font-bold text-gray-800">
        Data Pipeline Simulator
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
        <div className="flex flex-col gap-4">
          <SimulationControl onStepChange={setActiveStep} />
        </div>
        <div className="h-[600px] bg-white rounded shadow border border-gray-200 overflow-hidden">
           <PipelineFlow activeStep={activeStep} />
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <VirtualDBProvider>
      <FileSystemProvider>
        <Dashboard />
      </FileSystemProvider>
    </VirtualDBProvider>
  );
}

export default App;
