/**
 * データソースコンテキスト
 * データソース設定、トピック、テーブル定義を管理する専門Context
 */
import React, { createContext, useContext, useState, type ReactNode, useCallback, useEffect } from 'react';
import { type DataSourceSettings, type TopicDefinition, type TableDefinition } from '../types';
import { migrateDataSourceSettings } from '../migrations/DataMigration';

interface DataSourceContextType {
  dataSource: DataSourceSettings;
  setDataSource: React.Dispatch<React.SetStateAction<DataSourceSettings>>;

  topics: TopicDefinition[];
  addTopic: (name: string, retentionPeriod: number) => void;
  removeTopic: (id: string) => void;
  updateTopic: (id: string, name: string, retentionPeriod: number) => void;

  tables: TableDefinition[];
  addTable: (name: string) => void;
  removeTable: (id: string) => void;
  addColumn: (tableId: string, columnName: string, type: string) => void;
  removeColumn: (tableId: string, columnName: string) => void;
  setTables: React.Dispatch<React.SetStateAction<TableDefinition[]>>;
}

const DataSourceContext = createContext<DataSourceContextType | undefined>(undefined);

export const DataSourceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dataSource, setDataSource] = useState<DataSourceSettings>({
    jobs: [
      {
        id: 'gen_job_1',
        name: 'Default Source Generator',
        connectionId: 'conn_src_host1',
        path: '/source',
        fileNamePattern: '${host}_data_${timestamp}.csv',
        fileContent: 'col1,col2,col3\nsample,data,123',
        mode: 'schema',
        rowCount: 1,
        schema: [
          { id: 'c_1', name: 'id', type: 'sequence', params: { start: 1, step: 1 } },
          { id: 'c_2', name: 'value', type: 'randomInt', params: { min: 0, max: 100 } },
          { id: 'c_3', name: 'ts', type: 'static', params: { value: '${timestamp}' } }
        ],
        executionInterval: 1000,
        enabled: true,
      }
    ],
    archiveJobs: []
  });

  const [topics, setTopics] = useState<TopicDefinition[]>([
    { id: 'topic_1', name: 'SalesData', retentionPeriod: 60000 }
  ]);

  const [tables, setTables] = useState<TableDefinition[]>([
    {
      id: 'tbl_raw',
      name: 'raw_data',
      columns: [
        { name: 'col1', type: 'string' },
        { name: 'col2', type: 'string' },
        { name: 'col3', type: 'string' }
      ]
    },
    {
      id: 'tbl_summary',
      name: 'summary_data',
      columns: [
        { name: 'count', type: 'number' },
        { name: 'lastProcessedTimestamp', type: 'number' },
        { name: 'summary', type: 'string' },
        { name: 'timestamp', type: 'number' }
      ]
    }
  ]);

  useEffect(() => {
    const saved = localStorage.getItem('pipeline-simulator-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);

        const migratedDS = migrateDataSourceSettings(parsed);
        if (migratedDS) setDataSource(migratedDS);

        if (parsed.topics) setTopics(parsed.topics);
        if (parsed.tables) setTables(parsed.tables);
      } catch (e) {
        console.error('Failed to load data source settings', e);
      }
    }
  }, []);

  const addTopic = useCallback((name: string, retentionPeriod: number) => {
    setTopics(prev => [...prev, { id: `topic_${Date.now()}`, name, retentionPeriod }]);
  }, []);

  const removeTopic = useCallback((id: string) => {
    setTopics(prev => prev.filter(t => t.id !== id));
  }, []);

  const updateTopic = useCallback((id: string, name: string, retentionPeriod: number) => {
    setTopics(prev => prev.map(t => t.id === id ? { ...t, name, retentionPeriod } : t));
  }, []);

  const addTable = useCallback((name: string) => {
    setTables(prev => [...prev, { id: `tbl_${Date.now()}`, name, columns: [] }]);
  }, []);

  const removeTable = useCallback((id: string) => {
    setTables(prev => prev.filter(t => t.id !== id));
  }, []);

  const addColumn = useCallback((tableId: string, columnName: string, type: string) => {
    setTables(prev => prev.map(t => {
      if (t.id !== tableId) return t;
      if (t.columns.some(c => c.name === columnName)) return t;
      return { ...t, columns: [...t.columns, { name: columnName, type }] };
    }));
  }, []);

  const removeColumn = useCallback((tableId: string, columnName: string) => {
    setTables(prev => prev.map(t => {
      if (t.id !== tableId) return t;
      return { ...t, columns: t.columns.filter(c => c.name !== columnName) };
    }));
  }, []);

  return (
    <DataSourceContext.Provider value={{
      dataSource, setDataSource,
      topics, addTopic, removeTopic, updateTopic,
      tables, addTable, removeTable, addColumn, removeColumn, setTables
    }}>
      {children}
    </DataSourceContext.Provider>
  );
};

export const useDataSource = () => {
  const context = useContext(DataSourceContext);
  if (context === undefined) {
    throw new Error('useDataSource must be used within a DataSourceProvider');
  }
  return context;
};
