import React, { createContext, useContext, useState, type ReactNode } from 'react';

export interface DataSourceJob {
  id: string;
  name: string;
  host: string;
  sourcePath: string;
  filePrefix: string;
  fileContent: string;
  executionInterval: number;
  enabled: boolean;
}

export interface DataSourceSettings {
  jobs: DataSourceJob[];
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

interface SettingsContextType {
  dataSource: DataSourceSettings;
  setDataSource: (settings: DataSourceSettings) => void;
  collection: CollectionSettings;
  setCollection: (settings: CollectionSettings) => void;
  delivery: DeliverySettings;
  setDelivery: (settings: DeliverySettings) => void;
  etl: EtlSettings;
  setEtl: (settings: EtlSettings) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dataSource, setDataSource] = useState<DataSourceSettings>({
    jobs: [
      {
        id: 'ds_job_1',
        name: 'Default Source',
        host: 'localhost',
        sourcePath: '/source',
        filePrefix: 'data_',
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
        sourceHost: 'localhost',
        sourcePath: '/source',
        filterRegex: '.*',
        targetHost: 'localhost',
        targetPath: '/incoming',
        bandwidth: 100,
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
