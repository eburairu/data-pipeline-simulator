import React, { createContext, useContext, useState, type ReactNode } from 'react';

export interface DataSourceSettings {
  sourcePath: string;
  filePrefix: string;
  fileContent: string;
  executionInterval: number;
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

export interface DeliverySettings {
  sourcePath: string;
  targetPath: string;
  processingTime: number;
  executionInterval: number;
}

export interface EtlSettings {
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
    sourcePath: '/source',
    filePrefix: 'data_',
    fileContent: 'sample,data,123',
    executionInterval: 1000,
  });

  const [collection, setCollection] = useState<CollectionSettings>({
    jobs: [
      {
        id: 'job_1',
        name: 'Default Job',
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
    sourcePath: '/incoming',
    targetPath: '/internal',
    processingTime: 1000,
    executionInterval: 1000,
  });

  const [etl, setEtl] = useState<EtlSettings>({
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
