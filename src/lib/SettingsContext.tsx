import React, { createContext, useContext, useState, type ReactNode } from 'react';

export interface DataSourceSettings {
  filePrefix: string;
  fileContent: string;
}

export interface CollectionSettings {
  sourcePath: string;
  targetPath: string;
  processingTime: number;
}

export interface DeliverySettings {
  sourcePath: string;
  targetPath: string;
  processingTime: number;
}

export interface EtlSettings {
  rawTableName: string;
  summaryTableName: string;
  processingTime: number;
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
    filePrefix: 'data_',
    fileContent: 'sample,data,123',
  });

  const [collection, setCollection] = useState<CollectionSettings>({
    sourcePath: '/source',
    targetPath: '/incoming',
    processingTime: 1000,
  });

  const [delivery, setDelivery] = useState<DeliverySettings>({
    sourcePath: '/incoming',
    targetPath: '/internal',
    processingTime: 1000,
  });

  const [etl, setEtl] = useState<EtlSettings>({
    rawTableName: 'raw_data',
    summaryTableName: 'summary_data',
    processingTime: 1000,
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
