import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FileSystemProvider, useFileSystem, type VFile } from './lib/VirtualFileSystem';
import { VirtualDBProvider, useVirtualDB } from './lib/VirtualDB';
import { SettingsProvider, useSettings } from './lib/SettingsContext';
import { LanguageProvider } from './lib/i18n/LanguageContext';
import { JobMonitorProvider, type JobType } from './lib/JobMonitorContext';
import PipelineFlow from './components/PipelineFlow';
import BiDashboard from './components/BiDashboard';
import SettingsPanel from './components/settings/SettingsPanel';
import JobMonitor from './components/JobMonitor';
import 'reactflow/dist/style.css';
import { Settings, Play, Pause, Activity, FilePlus, AlertTriangle, List, Grid3X3, MonitorPlay, Book, Globe } from 'lucide-react';
import Documentation from './components/Documentation';
import { useTranslation } from './lib/i18n/LanguageContext';
import { useSimulationEngine } from './lib/hooks/useSimulationEngine';
import { useSimulationTimers } from './lib/hooks/useSimulationTimers';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { processTemplate } from './lib/templateUtils';
import { generateDataFromSchema } from './lib/DataGenerator';

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
  const { t } = useTranslation();
  const [activeSteps, setActiveSteps] = useState<string[]>([]);
  const [isGeneratorRunning, setIsGeneratorRunning] = useState(false);
  const [isTransferRunning, setIsTransferRunning] = useState(false);
  const [isMappingRunning, setIsMappingRunning] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const { listFiles, writeFile } = useFileSystem();
  const { select } = useVirtualDB();
  const { dataSource, collection, delivery, topics, connections, tables, biDashboard } = useSettings();
  const sequenceStates = useRef<Record<string, Record<string, number>>>({});

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

            <StorageViews dataSource={dataSource} collection={collection} delivery={delivery} topics={topics} listFiles={safeListFiles} connections={connections} />

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

// Helper Components for Cleaner Render
interface StorageViewsProps {
  dataSource: any;
  collection: any;
  delivery: any;
  topics: any[];
  connections: any[];
  listFiles: (host: string, path: string) => VFile[];
}

const StorageViews: React.FC<StorageViewsProps> = ({ dataSource, collection, delivery, topics, connections, listFiles }) => {
  const { t } = useTranslation();
  const sourceStorages = dataSource.definitions.map((d: any) => ({ name: d.name, host: d.host, path: d.path, type: 'source' }));
  const topicStorages = topics.map((t: any) => ({ name: t.name, host: 'localhost', path: `/topics/${t.id}`, type: 'topic' }));
  const incomingPaths = new Set<string>();
  const incomingStorages: { host: string, path: string, type: 'incoming' }[] = [];
  collection.jobs.forEach((job: any) => {
    if (job.targetType === 'topic') return;
    const conn = connections.find(c => c.id === job.targetConnectionId);
    if (conn && conn.type === 'file' && conn.host && conn.path) {
        const key = `${conn.host}:${conn.path}`;
        if (!incomingPaths.has(key)) { incomingPaths.add(key); incomingStorages.push({ host: conn.host, path: conn.path, type: 'incoming' }); }
    }
  });
  const internalPaths = new Set<string>();
  const internalStorages: { host: string, path: string, type: 'internal' }[] = [];
  delivery.jobs.forEach((job: any) => {
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
          {sourceStorages.map((s: any) => <StorageView key={`${s.host}:${s.path}`} {...s} files={listFiles(s.host, s.path)} />)}
        </div>
      </div>
      <div className="border p-2 sm:p-3 rounded bg-gray-50/50">
        <h3 className="font-bold border-b mb-2 pb-1 text-gray-700 flex items-center gap-2 text-xs sm:text-sm"><span className="w-2 h-2 rounded-full bg-orange-500"></span> {t('app.storage.intermediate')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {topicStorages.map((s: any) => <StorageView key={`topic-${s.name}`} {...s} files={listFiles(s.host, s.path)} />)}
          {incomingStorages.map((s: any) => <StorageView key={`${s.host}:${s.path}`} {...s} files={listFiles(s.host, s.path)} />)}
        </div>
      </div>
      <div className="border p-2 sm:p-3 rounded bg-gray-50/50">
        <h3 className="font-bold border-b mb-2 pb-1 text-gray-700 flex items-center gap-2 text-xs sm:text-sm"><span className="w-2 h-2 rounded-full bg-blue-500"></span> {t('app.storage.internal')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {internalStorages.map((s: any) => <StorageView key={`${s.host}:${s.path}`} {...s} files={listFiles(s.host, s.path)} />)}
        </div>
      </div>
    </div>
  );
}

interface DatabaseViewProps {
  tables: any[];
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

        {activeTab === 'documentation' && <div className="h-[calc(100vh-140px)]"><Documentation /></div>}
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