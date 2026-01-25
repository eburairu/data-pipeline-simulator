import React, { createContext, useContext, useState, type ReactNode } from 'react';

export interface DataSourceJob {
  id: string;
  name: string;
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
  sourcePath: string;
  filterRegex: string;
  targetPath: string;
  executionInterval: number;
  enabled: boolean;
}

export interface CollectionSettings {
  jobs: CollectionJob[];
  processingTime: number;
}

export interface DeliveryJob {
  id: string;
  name: string;
  sourcePath: string;
  targetPath: string;
  filterRegex: string;
  processingTime: number;
  executionInterval: number;
  enabled: boolean;
}

export interface DeliverySettings {
  jobs: DeliveryJob[];
}

export interface EtlSettings {
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
        sourcePath: '/source',
        filterRegex: '.*',
        targetPath: '/incoming',
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
        sourcePath: '/incoming',
        targetPath: '/internal',
        filterRegex: '.*',
        processingTime: 1000,
        executionInterval: 1000,
        enabled: true,
      }
    ]
  });

  const [etl, setEtl] = useState<EtlSettings>({
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
