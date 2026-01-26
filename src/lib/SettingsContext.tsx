import React, { createContext, useContext, useState, type ReactNode, useCallback, useEffect } from 'react';
import { validateAllSettings, type ValidationError } from './validation';

export interface DataSourceDefinition {
  id: string;
  name: string;
  host: string;
  path: string;
}

export interface GenerationJob {
  id: string;
  name: string;
  dataSourceId: string; // Refers to DataSourceDefinition.id
  fileNamePattern: string;
  fileContent: string;
  executionInterval: number;
  enabled: boolean;
}

export interface DataSourceSettings {
  definitions: DataSourceDefinition[];
  jobs: GenerationJob[];
}

export interface CollectionJob {
  id: string;
  name: string;
  sourceHost: string;
  sourcePath: string;
  filterRegex: string;
  targetHost: string;
  targetPath: string;
  bandwidth: number; // 帯域幅 (文字数/秒)
  renamePattern: string;
  executionInterval: number;
  enabled: boolean;
}

export interface CollectionSettings {
  jobs: CollectionJob[];
  processingTime: number; // レイテンシ/オーバーヘッド (ms)
}

export interface DeliveryJob {
  id: string;
  name: string;
  sourceHost: string;
  sourcePath: string;
  targetHost: string;
  targetPath: string;
  filterRegex: string;
  bandwidth: number; // 帯域幅 (文字数/秒)
  processingTime: number; // レイテンシ/オーバーヘッド (ms)
  executionInterval: number;
  enabled: boolean;
}

export interface DeliverySettings {
  jobs: DeliveryJob[];
}

export interface EtlSettings {
  sourceHost: string;
  sourcePath: string;
  rawTableName: string;
  summaryTableName: string;
  processingTime: number;
  executionInterval: number;
}

export interface Host {
  name: string;
  directories: string[];
}

interface SettingsContextType {
  dataSource: DataSourceSettings;
  setDataSource: (settings: DataSourceSettings) => void;
  collection: CollectionSettings;
  setCollection: (settings: CollectionSettings) => void;
  delivery: DeliverySettings;
  setDelivery: (settings: DeliverySettings) => void;
  etl: EtlSettings;
  setEtl: (settings: EtlSettings) => void;

  hosts: Host[];
  addHost: (name: string) => void;
  removeHost: (name: string) => void;
  addDirectory: (hostName: string, path: string) => void;
  removeDirectory: (hostName: string, path: string) => void;
  isHostInUse: (hostName: string) => boolean;
  isDirectoryInUse: (hostName: string, path: string) => boolean;

  saveSettings: () => { success: boolean; errors?: ValidationError[] };
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dataSource, setDataSource] = useState<DataSourceSettings>({
    definitions: [
      {
        id: 'ds_def_1',
        name: 'Default Source Location',
        host: 'host1',
        path: '/source'
      }
    ],
    jobs: [
      {
        id: 'gen_job_1',
        name: 'Default Source Generator',
        dataSourceId: 'ds_def_1',
        fileNamePattern: '${host}_data_${timestamp}.csv',
        fileContent: 'sample,data,123',
        executionInterval: 1000,
        enabled: true,
      }
    ]
  });

  const [collection, setCollection] = useState<CollectionSettings>({
    jobs: [
      {
        id: 'col_job_1',
        name: 'Default Collection',
        sourceHost: 'host1',
        sourcePath: '/source',
        filterRegex: '.*',
        targetHost: 'localhost',
        targetPath: '/incoming',
        bandwidth: 100,
        renamePattern: '${fileName}',
        executionInterval: 1000,
        enabled: true,
      }
    ],
    processingTime: 1000,
  });

  const [delivery, setDelivery] = useState<DeliverySettings>({
    jobs: [
      {
        id: 'del_job_1',
        name: 'Default Delivery',
        sourceHost: 'localhost',
        sourcePath: '/incoming',
        targetHost: 'localhost',
        targetPath: '/internal',
        filterRegex: '.*',
        bandwidth: 100,
        processingTime: 1000,
        executionInterval: 1000,
        enabled: true,
      }
    ]
  });

  const [etl, setEtl] = useState<EtlSettings>({
    sourceHost: 'localhost',
    sourcePath: '/internal',
    rawTableName: 'raw_data',
    summaryTableName: 'summary_data',
    processingTime: 1000,
    executionInterval: 1000,
  });

  const [hosts, setHosts] = useState<Host[]>([
    { name: 'host1', directories: ['/source'] },
    { name: 'host2', directories: ['/source'] },
    { name: 'localhost', directories: ['/incoming', '/internal'] },
  ]);

  // Load settings from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('pipeline-simulator-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.dataSource) {
          // Check if it's the new structure
          if (parsed.dataSource.definitions && parsed.dataSource.jobs) {
            setDataSource(parsed.dataSource);
          } else if (Array.isArray(parsed.dataSource.jobs)) {
             // Basic migration for old structure
             // Old job: { id, name, host, sourcePath, ... }
             // We need to split this into definitions and generation jobs
             const newDefinitions: DataSourceDefinition[] = [];
             const newJobs: GenerationJob[] = [];

             parsed.dataSource.jobs.forEach((oldJob: any) => {
                const defId = `ds_def_${oldJob.id}`;
                // Check if we already have a definition for this host/path?
                // For simplicity, 1:1 migration
                newDefinitions.push({
                  id: defId,
                  name: `${oldJob.name} Location`,
                  host: oldJob.host,
                  path: oldJob.sourcePath
                });

                newJobs.push({
                  id: oldJob.id,
                  name: oldJob.name,
                  dataSourceId: defId,
                  fileNamePattern: oldJob.fileNamePattern,
                  fileContent: oldJob.fileContent,
                  executionInterval: oldJob.executionInterval,
                  enabled: oldJob.enabled
                });
             });
             setDataSource({ definitions: newDefinitions, jobs: newJobs });
          }
        }
        if (parsed.collection) setCollection(parsed.collection);
        if (parsed.delivery) setDelivery(parsed.delivery);
        if (parsed.etl) setEtl(parsed.etl);
        if (parsed.hosts) setHosts(parsed.hosts);
      } catch (e) {
        console.error('Failed to parse settings', e);
      }
    }
  }, []);

  const saveSettings = useCallback(() => {
    const errors = validateAllSettings(dataSource, collection, delivery, etl);
    if (errors.length > 0) {
      return { success: false, errors };
    }

    const settingsToSave = {
      dataSource,
      collection,
      delivery,
      etl,
      hosts
    };
    try {
      localStorage.setItem('pipeline-simulator-settings', JSON.stringify(settingsToSave));
      return { success: true };
    } catch (e) {
      console.error("Failed to save settings", e);
      return { success: false, errors: [{ field: 'storage', message: 'Failed to save to local storage' }] };
    }
  }, [dataSource, collection, delivery, etl, hosts]);

  const addHost = useCallback((name: string) => {
    setHosts(prev => {
      if (prev.some(h => h.name === name)) return prev;
      return [...prev, { name, directories: [] }];
    });
  }, []);

  const removeHost = useCallback((name: string) => {
    setHosts(prev => prev.filter(h => h.name !== name));
  }, []);

  const addDirectory = useCallback((hostName: string, path: string) => {
    setHosts(prev => prev.map(h => {
      if (h.name !== hostName) return h;
      if (h.directories.includes(path)) return h;
      return { ...h, directories: [...h.directories, path] };
    }));
  }, []);

  const removeDirectory = useCallback((hostName: string, path: string) => {
    setHosts(prev => prev.map(h => {
      if (h.name !== hostName) return h;
      return { ...h, directories: h.directories.filter(d => d !== path) };
    }));
  }, []);

  const isHostInUse = useCallback((hostName: string) => {
    const inDataSource = dataSource.definitions.some(d => d.host === hostName);
    const inCollection = collection.jobs.some(j => j.sourceHost === hostName || j.targetHost === hostName);
    const inDelivery = delivery.jobs.some(j => j.sourceHost === hostName || j.targetHost === hostName);
    const inEtl = etl.sourceHost === hostName;

    return inDataSource || inCollection || inDelivery || inEtl;
  }, [dataSource, collection, delivery, etl]);

  const isDirectoryInUse = useCallback((hostName: string, path: string) => {
    const inDataSource = dataSource.definitions.some(d => d.host === hostName && d.path === path);
    const inCollection = collection.jobs.some(j =>
      (j.sourceHost === hostName && j.sourcePath === path) ||
      (j.targetHost === hostName && j.targetPath === path)
    );
    const inDelivery = delivery.jobs.some(j =>
      (j.sourceHost === hostName && j.sourcePath === path) ||
      (j.targetHost === hostName && j.targetPath === path)
    );
    const inEtl = etl.sourceHost === hostName && etl.sourcePath === path;

    return inDataSource || inCollection || inDelivery || inEtl;
  }, [dataSource, collection, delivery, etl]);

  return (
    <SettingsContext.Provider
      value={{
        dataSource,
        setDataSource,
        collection,
        setCollection,
        delivery,
        setDelivery,
        etl,
        setEtl,
        hosts,
        addHost,
        removeHost,
        addDirectory,
        removeDirectory,
        isHostInUse,
        isDirectoryInUse,
        saveSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
