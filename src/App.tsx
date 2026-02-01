import React, { useState, useEffect, useCallback } from 'react';
import { FileSystemProvider, useFileSystem, type VFile } from './lib/VirtualFileSystem';
import { VirtualDBProvider } from './lib/VirtualDB';
import { SettingsProvider, useSettings } from './lib/SettingsContext';
import { LanguageProvider } from './lib/i18n/LanguageContext';
import { JobMonitorProvider, type JobType } from './lib/JobMonitorContext';
import PipelineFlow from './components/PipelineFlow';
import BiDashboard from './components/BiDashboard';
import SettingsPanel from './components/settings/SettingsPanel';
import JobMonitor from './components/JobMonitor';
import 'reactflow/dist/style.css';
import { Settings, Play, Pause, Activity, FilePlus, AlertTriangle, Grid3X3, MonitorPlay, Book } from 'lucide-react';
import Documentation from './components/Documentation';
import { useTranslation } from './lib/i18n/LanguageContext';
import { Globe } from 'lucide-react';
import { useSimulationEngine } from './lib/hooks/useSimulationEngine';
import { useSimulationTimers } from './lib/hooks/useSimulationTimers';
import { ErrorBoundary } from './components/common/ErrorBoundary';

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

// Wrapper to handle the cyclic dependency between Logic and Logger
const SimulationManager: React.FC<{ setRetryHandler: (handler: (id: string, type: JobType) => void) => void }> = ({ setRetryHandler }) => {
  const [activeSteps, setActiveSteps] = useState<string[]>([]);
  const [isGeneratorRunning, setIsGeneratorRunning] = useState(false);
  const [isTransferRunning, setIsTransferRunning] = useState(false);
  const [isMappingRunning, setIsMappingRunning] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const { listFiles } = useFileSystem();
  const { dataSource, topics, connections, biDashboard } = useSettings();

  const toggleStep = useCallback((step: string, active: boolean) => {
    setActiveSteps(prev => active ? (prev.includes(step) ? prev : [...prev, step]) : prev.filter(s => s !== step));
  }, []);

  const engine = useSimulationEngine(toggleStep, setErrors);
  
  useSimulationTimers(
    { generator: isGeneratorRunning, transfer: isTransferRunning, mapping: isMappingRunning },
    engine
  );

  useEffect(() => {
    setRetryHandler((jobId, jobType) => {
      if (jobType === 'collection') engine.executeCollectionJob(jobId);
      if (jobType === 'delivery') engine.executeDeliveryJob(jobId);
      if (jobType === 'mapping') engine.executeMappingJob(jobId);
      if (jobType === 'taskflow') engine.executeTaskFlow(jobId);
    });
  }, [setRetryHandler, engine]);

  const getStorageFiles = useCallback((host: string, path: string) => {
    return listFiles(host, path);
  }, [listFiles]);

  const storageConfigs = React.useMemo(() => {
    const configs: Array<{ id: string; name?: string; host: string; path: string; type: 'source' | 'topic' | 'incoming' | 'target' }> = [];
    dataSource.definitions.forEach(d => configs.push({ id: `ds-${d.id}`, name: d.name, host: d.host, path: d.path, type: 'source' }));
    topics.forEach(t => configs.push({ id: `tp-${t.id}`, name: t.name, host: 'localhost', path: `/topics/${t.id}`, type: 'topic' }));
    connections.filter(c => c.type === 'file' && c.host && c.path).forEach(c => {
        if (!configs.find(ex => ex.host === c.host && ex.path === c.path)) {
            configs.push({ id: `cn-${c.id}`, name: c.name, host: c.host!, path: c.path!, type: 'target' });
        }
    });
    return configs;
  }, [dataSource.definitions, topics, connections]);

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden font-sans text-gray-900">
      <header className="bg-white border-b border-gray-200 h-14 flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-1.5 rounded-lg shadow-blue-200 shadow-lg">
            <Activity className="text-white w-5 h-5" />
          </div>
          <h1 className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">DataPipeline Simulator</h1>
        </div>
        <div className="flex items-center gap-3">
          {errors.length > 0 && (
            <div className="flex items-center gap-2 bg-red-50 text-red-600 px-3 py-1.5 rounded-full text-xs font-bold border border-red-100 animate-pulse">
              <AlertTriangle size={14} />
              <span>{errors.length} ERRORS</span>
            </div>
          )}
          <div className="h-6 w-px bg-gray-200 mx-2"></div>
          <div className="flex bg-gray-100 p-1 rounded-lg">
             <button
                onClick={() => setIsGeneratorRunning(!isGeneratorRunning)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${isGeneratorRunning ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {isGeneratorRunning ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                GEN
              </button>
              <button
                onClick={() => setIsTransferRunning(!isTransferRunning)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${isTransferRunning ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {isTransferRunning ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                XFER
              </button>
              <button
                onClick={() => setIsMappingRunning(!isMappingRunning)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${isMappingRunning ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {isMappingRunning ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                MAP
              </button>
          </div>
        </div>
      </header>

      <main className="flex-grow flex overflow-hidden">
        <div className="flex-grow flex flex-col min-w-0">
          <div className="h-1/2 p-4 pb-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full overflow-hidden flex flex-col">
              <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                 <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                   <Grid3X3 size={16} className="text-blue-500" />
                   Pipeline Visualization
                 </h2>
              </div>
              <div className="flex-grow relative">
                 <PipelineFlow activeSteps={activeSteps} />
              </div>
            </div>
          </div>
          <div className="h-1/2 p-4 pt-2">
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full overflow-hidden flex flex-col">
                <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                   <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                     <MonitorPlay size={16} className="text-orange-500" />
                     Real-time Monitoring
                   </h2>
                </div>
                <div className="flex-grow overflow-hidden">
                   {biDashboard.showDashboard ? <BiDashboard /> : <JobMonitor />}
                </div>
             </div>
          </div>
        </div>

        <aside className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0 shadow-2xl z-0">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
             <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <FilePlus size={16} className="text-green-500" />
                Virtual Storage
             </h2>
          </div>
          <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-50/30">
            {storageConfigs.map(config => (
               <div key={config.id} className="h-40">
                  <StorageView
                    name={config.name}
                    host={config.host}
                    path={config.path}
                    type={config.type}
                    files={getStorageFiles(config.host, config.path)}
                  />
               </div>
            ))}
          </div>
        </aside>
      </main>
    </div>
  );
};

function App() {
  const [activeTab, setActiveTab] = useState<'simulation' | 'settings' | 'documentation'>('simulation');
  const [retryHandler, setRetryHandler] = useState<((id: string, type: JobType) => void) | null>(null);
  const { language, setLanguage } = useTranslation();

  const handleRetry = useCallback((id: string, type: JobType) => {
    if (retryHandler) retryHandler(id, type);
  }, [retryHandler]);

  return (
    <JobMonitorProvider retryJob={handleRetry}>
      <div className="flex h-screen overflow-hidden bg-gray-900">
        <nav className="w-16 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-6 gap-6 shrink-0 z-20">
          <button
            onClick={() => setActiveTab('simulation')}
            className={`p-3 rounded-xl transition-all ${activeTab === 'simulation' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'}`}
            title="Simulation"
          >
            <Activity size={24} />
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`p-3 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'}`}
            title="Settings"
          >
            <Settings size={24} />
          </button>
          <button
            onClick={() => setActiveTab('documentation')}
            className={`p-3 rounded-xl transition-all ${activeTab === 'documentation' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'}`}
            title="Documentation"
          >
            <Book size={24} />
          </button>
          
          <div className="mt-auto flex flex-col gap-4 items-center">
            <button
              onClick={() => setLanguage(language === 'en' ? 'ja' : 'en')}
              className="p-2 text-gray-500 hover:text-white transition-colors"
              title="Switch Language"
            >
              <Globe size={20} />
              <span className="text-[10px] block font-bold mt-1 uppercase">{language}</span>
            </button>
          </div>
        </nav>

        <div className="flex-grow overflow-hidden relative">
          {activeTab === 'simulation' && <SimulationManager setRetryHandler={setRetryHandler} />}
          {activeTab === 'settings' && <SettingsPanel />}
          {activeTab === 'documentation' && <Documentation />}
        </div>
      </div>
    </JobMonitorProvider>
  );
}

export default function AppWrapper() {

  return (

    <ErrorBoundary>



      <SettingsProvider>

        <VirtualDBProvider>

          <FileSystemProvider>

            <LanguageProvider>

              <App />

            </LanguageProvider>

          </FileSystemProvider>

        </VirtualDBProvider>

      </SettingsProvider>

    </ErrorBoundary>

  );

}
