import React, { createContext, useContext, useState, type ReactNode, useCallback, useEffect } from 'react';
import { validateAllSettings, type ValidationError } from './validation';
import { type Mapping, type MappingTask } from './MappingTypes';
import { type DBFilter } from './VirtualDB';

export interface DataSourceDefinition {
  id: string;
  name: string;
  host: string;
  path: string;
}

export type GeneratorType = 'static' | 'randomInt' | 'randomFloat' | 'sin' | 'cos' | 'sequence' | 'uuid' | 'list' | 'timestamp';

export interface ColumnSchema {
  id: string;
  name: string;
  type: GeneratorType;
  params: Record<string, any>;
}

export interface GenerationJob {
  id: string;
  name: string;
  dataSourceId: string; // Refers to DataSourceDefinition.id
  fileNamePattern: string;
  // Template mode
  fileContent: string;
  // Schema mode
  mode?: 'template' | 'schema';
  rowCount?: number;
  schema?: ColumnSchema[];

  executionInterval: number;
  enabled: boolean;
}

export interface DataSourceSettings {
  definitions: DataSourceDefinition[];
  jobs: GenerationJob[];
}

export interface TopicDefinition {
  id: string;
  name: string;
  retentionPeriod: number; // ms
}

export type Topic = TopicDefinition; // Alias for backward compatibility if needed, or replace usages

export interface CollectionJob {
  id: string;
  name: string;
  sourceConnectionId: string; // ConnectionDefinition.id (type='file')
  filterRegex: string;

  targetType?: 'host' | 'topic'; // Default: 'host'
  targetConnectionId?: string; // Used when targetType is 'host'
  targetTopicId?: string; // Used when targetType is 'topic'

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

  sourceType?: 'host' | 'topic'; // Default: 'host'
  sourceConnectionId?: string; // Used when sourceType is 'host'
  sourceTopicId?: string; // Used when sourceType is 'topic'

  targetConnectionId: string; // ConnectionDefinition.id (type='file')

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

export interface ColumnDefinition {
  name: string;
  type: string; // 'string', 'number', 'boolean', etc.
}

export interface TableDefinition {
  id: string;
  name: string;
  columns: ColumnDefinition[];
}

// ... (existing interfaces)

export type ConnectionType = 'file' | 'database';

export interface ConnectionDefinition {
  id: string;
  name: string;
  type: ConnectionType;
  // File specific
  host?: string;
  path?: string;
  // Database specific
  databaseName?: string; // Logical DB name (currently unused, mostly for display)
  tableName?: string;    // Default table
}

export interface DashboardItem {
  id: string;
  title?: string;
  tableId: string;
  viewType: 'table' | 'chart';
  filters: DBFilter[];
  chartConfig?: {
    xAxis: string;
    yAxis: string;
  };
  refreshInterval: number;
}

export interface BiDashboardSettings {
  showDashboard: boolean;
  items: DashboardItem[];
}

// ---------------------

interface SettingsContextType {
  dataSource: DataSourceSettings;
  setDataSource: (settings: DataSourceSettings) => void;
  collection: CollectionSettings;
  setCollection: (settings: CollectionSettings) => void;
  delivery: DeliverySettings;
  setDelivery: (settings: DeliverySettings) => void;
  etl: EtlSettings;
  setEtl: (settings: EtlSettings) => void;
  biDashboard: BiDashboardSettings;
  setBiDashboard: (settings: BiDashboardSettings) => void;

  hosts: Host[];
// ... (rest of the interface)
  addHost: (name: string) => void;
  removeHost: (name: string) => void;
  addDirectory: (hostName: string, path: string) => void;
  removeDirectory: (hostName: string, path: string) => void;
  isHostInUse: (hostName: string) => boolean;
  isDirectoryInUse: (hostName: string, path: string) => boolean;

  topics: TopicDefinition[];
  addTopic: (name: string, retentionPeriod: number) => void;
  removeTopic: (id: string) => void;
  updateTopic: (id: string, name: string, retentionPeriod: number) => void;

  tables: TableDefinition[];
  addTable: (name: string) => void;
  removeTable: (id: string) => void;
  addColumn: (tableId: string, columnName: string, type: string) => void;
  removeColumn: (tableId: string, columnName: string) => void;

  // Data Integration Features
  connections: ConnectionDefinition[];
  addConnection: (conn: Omit<ConnectionDefinition, 'id'>) => void;
  removeConnection: (id: string) => void;
  updateConnection: (id: string, updates: Partial<ConnectionDefinition>) => void;

  mappings: Mapping[];
  addMapping: (mapping: Mapping) => void;
  removeMapping: (id: string) => void;
  updateMapping: (id: string, mapping: Mapping) => void;

  mappingTasks: MappingTask[];
  addMappingTask: (task: MappingTask) => void;
  removeMappingTask: (id: string) => void;
  updateMappingTask: (id: string, updates: Partial<MappingTask>) => void;

  saveSettings: () => { success: boolean; errors?: ValidationError[] };
  applyIdempotencyTemplate: () => void;
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
    ]
  });

  const [collection, setCollection] = useState<CollectionSettings>({
    jobs: [
      {
        id: 'col_job_1',
        name: 'Default Collection',
        sourceConnectionId: 'conn_src_host1',
        filterRegex: '.*',
        targetType: 'host',
        targetConnectionId: 'conn_incoming',
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
        sourceType: 'host',
        sourceConnectionId: 'conn_incoming',
        targetConnectionId: 'conn_internal',
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

  const [biDashboard, setBiDashboard] = useState<BiDashboardSettings>({
    showDashboard: true,
    items: [],
  });

  const [hosts, setHosts] = useState<Host[]>([
    { name: 'host1', directories: ['/source'] },
    { name: 'host2', directories: ['/source'] },
    { name: 'localhost', directories: ['/incoming', '/internal'] },
  ]);

  const [topics, setTopics] = useState<TopicDefinition[]>([
    { id: 'topic_1', name: 'SalesData', retentionPeriod: 60000 } // Default 1 min
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

  const [connections, setConnections] = useState<ConnectionDefinition[]>([
    {
      id: 'conn_raw',
      name: 'Raw Data Source (File)',
      type: 'file',
      host: 'localhost',
      path: '/internal'
    },
    {
      id: 'conn_raw_db',
      name: 'Raw Database',
      type: 'database',
      tableName: 'raw_data'
    },
    {
      id: 'conn_summary_db',
      name: 'Summary Database',
      type: 'database',
      tableName: 'summary_data'
    },
    {
        id: 'conn_src_host1',
        name: 'Source (Host1)',
        type: 'file',
        host: 'host1',
        path: '/source'
    },
    {
        id: 'conn_incoming',
        name: 'Incoming Folder',
        type: 'file',
        host: 'localhost',
        path: '/incoming'
    },
    {
        id: 'conn_internal',
        name: 'Internal Folder',
        type: 'file',
        host: 'localhost',
        path: '/internal'
    }
  ]);

  const [mappings, setMappings] = useState<Mapping[]>([
    {
        id: 'm_load_raw',
        name: 'Load Raw Data',
        transformations: [
            { id: 't_src_raw', type: 'source', name: 'Read File', position: { x: 0, y: 0 }, config: { connectionId: 'conn_raw', deleteAfterRead: true } },
            { id: 't_tgt_raw', type: 'target', name: 'Write DB', position: { x: 300, y: 0 }, config: { connectionId: 'conn_raw_db' } }
        ],
        links: [
            { id: 'l_1', sourceId: 't_src_raw', targetId: 't_tgt_raw' }
        ]
    },
    {
        id: 'm_agg_summary',
        name: 'Aggregate Summary',
        transformations: [
            { id: 't_src_db', type: 'source', name: 'Read Raw', position: { x: 0, y: 0 }, config: { connectionId: 'conn_raw_db' } },
            { id: 't_agg', type: 'aggregator', name: 'Count & Max', position: { x: 200, y: 0 }, config: {
                groupBy: [],
                aggregates: [
                    { name: 'count', function: 'count', field: 'id' },
                    { name: 'lastProcessedTimestamp', function: 'max', field: 'insertedAt' }
                ]
            }},
            { id: 't_exp', type: 'expression', name: 'Add Meta', position: { x: 400, y: 0 }, config: {
                fields: [
                    { name: 'summary', expression: "'processed_batch'" },
                    { name: 'timestamp', expression: "Date.now()" }
                ]
            }},
            { id: 't_tgt_sum', type: 'target', name: 'Write Summary', position: { x: 600, y: 0 }, config: { connectionId: 'conn_summary_db' } }
        ],
        links: [
            { id: 'l_2', sourceId: 't_src_db', targetId: 't_agg' },
            { id: 'l_3', sourceId: 't_agg', targetId: 't_exp' },
            { id: 'l_4', sourceId: 't_exp', targetId: 't_tgt_sum' }
        ]
    }
  ]);

  const [mappingTasks, setMappingTasks] = useState<MappingTask[]>([
      { id: 'mt_raw', name: 'Run Raw Load', mappingId: 'm_load_raw', executionInterval: 2000, enabled: true },
      { id: 'mt_agg', name: 'Run Aggregation', mappingId: 'm_agg_summary', executionInterval: 5000, enabled: true }
  ]);

  // Load settings from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('pipeline-simulator-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);

        let loadedConnections = parsed.connections || connections;

        const findOrCreateConnection = (host: string, path: string) => {
            const existing = loadedConnections.find((c: ConnectionDefinition) => c.type === 'file' && c.host === host && c.path === path);
            if (existing) return existing;

            const newConn: ConnectionDefinition = {
                id: `conn_${Date.now()}_auto_${Math.floor(Math.random() * 1000)}`,
                name: `Auto ${host}:${path}`,
                type: 'file',
                host,
                path
            };
            loadedConnections = [...loadedConnections, newConn];
            return newConn;
        };

        if (parsed.dataSource) {
          // Check if it's the new structure
          if (parsed.dataSource.definitions && parsed.dataSource.jobs) {
            setDataSource(parsed.dataSource);
          } else if (Array.isArray(parsed.dataSource.jobs)) {
             // Basic migration for old structure
             const newDefinitions: DataSourceDefinition[] = [];
             const newJobs: GenerationJob[] = [];

             parsed.dataSource.jobs.forEach((oldJob: any) => {
                const defId = `ds_def_${oldJob.id}`;
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
                  mode: oldJob.mode || 'template', // Default to template for migrated jobs
                  rowCount: oldJob.rowCount || 1,
                  schema: oldJob.schema || [],
                  executionInterval: oldJob.executionInterval,
                  enabled: oldJob.enabled
                });
             });
             setDataSource({ definitions: newDefinitions, jobs: newJobs });
          }
        }

        if (parsed.collection) {
            // Migration for new targetType fields AND connection migration
            const migratedJobs = parsed.collection.jobs.map((job: any) => {
                let newJob = { ...job, targetType: job.targetType || 'host' };

                // Migrate Source Host/Path -> Connection
                if (job.sourceHost) {
                   const conn = findOrCreateConnection(job.sourceHost, job.sourcePath);
                   newJob.sourceConnectionId = conn.id;
                   delete newJob.sourceHost;
                   delete newJob.sourcePath;
                }

                // Migrate Target Host/Path -> Connection
                if (newJob.targetType === 'host' && job.targetHost) {
                   const conn = findOrCreateConnection(job.targetHost, job.targetPath);
                   newJob.targetConnectionId = conn.id;
                   delete newJob.targetHost;
                   delete newJob.targetPath;
                }
                return newJob;
            });
            setCollection({ ...parsed.collection, jobs: migratedJobs });
        }

        if (parsed.delivery) {
             // Migration for new sourceType fields
            const migratedJobs = parsed.delivery.jobs.map((job: any) => {
                let newJob = { ...job, sourceType: job.sourceType || 'host' };

                // Migrate Source Host/Path -> Connection
                if (newJob.sourceType === 'host' && job.sourceHost) {
                   const conn = findOrCreateConnection(job.sourceHost, job.sourcePath);
                   newJob.sourceConnectionId = conn.id;
                   delete newJob.sourceHost;
                   delete newJob.sourcePath;
                }

                // Migrate Target Host/Path -> Connection
                if (job.targetHost) {
                   const conn = findOrCreateConnection(job.targetHost, job.targetPath);
                   newJob.targetConnectionId = conn.id;
                   delete newJob.targetHost;
                   delete newJob.targetPath;
                }

                return newJob;
            });
            setDelivery({ ...parsed.delivery, jobs: migratedJobs });
        }

        if (parsed.etl) setEtl(parsed.etl);
        if (parsed.biDashboard) {
          // Migration for old structure (flat properties to items array)
          if ('defaultTableId' in parsed.biDashboard) {
            const old = parsed.biDashboard;
            const newItem: DashboardItem = {
              id: 'dashboard_item_1',
              title: 'Default View',
              tableId: old.defaultTableId || '',
              viewType: old.defaultViewType || 'table',
              filters: [],
              refreshInterval: old.refreshInterval || 0,
            };
            setBiDashboard({
              showDashboard: old.showDashboard,
              items: newItem.tableId ? [newItem] : [],
            });
          } else {
            setBiDashboard(parsed.biDashboard);
          }
        } else if (parsed.visualization) {
          // Migration
          setBiDashboard(prev => ({ ...prev, showDashboard: parsed.visualization.showDashboard }));
        }
        if (parsed.hosts) setHosts(parsed.hosts);
        if (parsed.topics) setTopics(parsed.topics);
        if (parsed.tables) setTables(parsed.tables);
        if (parsed.mappings) setMappings(parsed.mappings);
        if (parsed.mappingTasks) setMappingTasks(parsed.mappingTasks);

        // Finally set connections (which might have been updated during migration)
        setConnections(loadedConnections);

      } catch (e) {
        console.error('Failed to parse settings', e);
      }
    }
  }, []);

  const saveSettings = useCallback(() => {
    // Note: We need to update validation logic for Topics and Connections
    const errors = validateAllSettings(dataSource, collection, delivery, etl, topics, connections);
    if (errors.length > 0) {
      return { success: false, errors };
    }

    const settingsToSave = {
      dataSource,
      collection,
      delivery,
      etl,
      biDashboard,
      hosts,
      topics,
      tables,
      connections,
      mappings,
      mappingTasks
    };
    try {
      localStorage.setItem('pipeline-simulator-settings', JSON.stringify(settingsToSave));
      return { success: true };
    } catch (e) {
      console.error("Failed to save settings", e);
      return { success: false, errors: [{ field: 'storage', message: 'Failed to save to local storage' }] };
    }
  }, [dataSource, collection, delivery, etl, biDashboard, hosts, topics, connections, mappings, mappingTasks]);

  const applyIdempotencyTemplate = useCallback(() => {
    const timestamp = Date.now();
    
    // 1. Setup Data Source (Generates duplicates)
    const hostName = 'localhost';
    const sourcePath = '/idempotency_source';
    
    // Ensure directory exists
    setHosts(prev => {
        const host = prev.find(h => h.name === hostName);
        if (!host) return prev; // Should exist
        if (host.directories.includes(sourcePath)) return prev;
        return prev.map(h => h.name === hostName ? { ...h, directories: [...h.directories, sourcePath] } : h);
    });

    const dsDefId = `ds_def_idem_${timestamp}`;
    const newDsDef: DataSourceDefinition = {
        id: dsDefId,
        name: 'Idempotency Test Source',
        host: hostName,
        path: sourcePath
    };

    const newDsJob: GenerationJob = {
        id: `gen_job_idem_${timestamp}`,
        name: 'Generate Duplicates',
        dataSourceId: dsDefId,
        fileNamePattern: 'data_${timestamp}.csv',
        fileContent: '',
        mode: 'schema',
        rowCount: 5,
        schema: [
            { id: `c_${timestamp}_1`, name: 'id', type: 'randomInt', params: { min: 1, max: 10 } }, // High collision chance
            { id: `c_${timestamp}_2`, name: 'value', type: 'randomInt', params: { min: 100, max: 999 } },
            { id: `c_${timestamp}_3`, name: 'updated_at', type: 'timestamp', params: {} }
        ],
        executionInterval: 5000,
        enabled: true // Auto-enable for convenience
    };

    setDataSource(prev => ({
        definitions: [...prev.definitions, newDsDef],
        jobs: [...prev.jobs, newDsJob]
    }));

    // 2. Setup Target Table
    const tableId = `tbl_idem_${timestamp}`;
    const tableName = 'idempotency_target';
    const newTable: TableDefinition = {
        id: tableId,
        name: tableName,
        columns: [
            { name: 'id', type: 'number' },
            { name: 'value', type: 'number' },
            { name: 'updated_at', type: 'string' }
        ]
    };
    setTables(prev => [...prev, newTable]);

    // 3. Setup Connections
    const connSrcId = `conn_src_idem_${timestamp}`;
    const connTgtId = `conn_tgt_idem_${timestamp}`;
    
    setConnections(prev => [
        ...prev,
        {
            id: connSrcId,
            name: 'Idempotency Source File',
            type: 'file',
            host: hostName,
            path: sourcePath
        },
        {
            id: connTgtId,
            name: 'Idempotency Target DB',
            type: 'database',
            tableName: tableName
        }
    ]);

    // 4. Setup Mapping (With Deduplication)
    const mappingId = `m_idem_${timestamp}`;
    const tSrcId = `t_src_${timestamp}`;
    const tDedupId = `t_dedup_${timestamp}`;
    const tTgtId = `t_tgt_${timestamp}`;

    const newMapping: Mapping = {
        id: mappingId,
        name: 'Idempotency Load (Dedup)',
        transformations: [
            { 
                id: tSrcId, 
                type: 'source', 
                name: 'Read CSV', 
                position: { x: 50, y: 100 }, 
                config: { connectionId: connSrcId, deleteAfterRead: true } 
            },
            { 
                id: tDedupId, 
                type: 'deduplicator', 
                name: 'Deduplicate IDs', 
                position: { x: 300, y: 100 }, 
                config: { keys: ['id'] } 
            },
            { 
                id: tTgtId, 
                type: 'target', 
                name: 'Upsert to DB', 
                position: { x: 550, y: 100 }, 
                config: { 
                    connectionId: connTgtId,
                    deduplicationKeys: ['id'], // DB level check
                    duplicateBehavior: 'update',
                    updateColumns: ['id'] // Key for update
                } 
            }
        ],
        links: [
            { id: `l_1_${timestamp}`, sourceId: tSrcId, targetId: tDedupId },
            { id: `l_2_${timestamp}`, sourceId: tDedupId, targetId: tTgtId }
        ]
    };
    setMappings(prev => [...prev, newMapping]);

    // 5. Setup Task
    const taskId = `mt_idem_${timestamp}`;
    setMappingTasks(prev => [...prev, {
        id: taskId,
        name: 'Run Idempotency Test',
        mappingId: mappingId,
        executionInterval: 5000,
        enabled: true
    }]);

    // Switch to Data Integration tab or notify?
    alert('Idempotency test resources created! Check Data Source (Generators), Database, and Data Integration tabs.');

  }, []);

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

  const addTopic = useCallback((name: string, retentionPeriod: number) => {
      setTopics(prev => [
          ...prev,
          { id: `topic_${Date.now()}`, name, retentionPeriod }
      ]);
  }, []);

  const removeTopic = useCallback((id: string) => {
      setTopics(prev => prev.filter(t => t.id !== id));
  }, []);

  const updateTopic = useCallback((id: string, name: string, retentionPeriod: number) => {
      setTopics(prev => prev.map(t => t.id === id ? { ...t, name, retentionPeriod } : t));
  }, []);

  // Table CRUD
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

  // Connection CRUD
  const addConnection = useCallback((conn: Omit<ConnectionDefinition, 'id'>) => {
    setConnections(prev => [...prev, { ...conn, id: `conn_${Date.now()}` }]);
  }, []);

  const removeConnection = useCallback((id: string) => {
    setConnections(prev => prev.filter(c => c.id !== id));
  }, []);

  const updateConnection = useCallback((id: string, updates: Partial<ConnectionDefinition>) => {
    setConnections(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  // Mapping CRUD
  const addMapping = useCallback((mapping: Mapping) => {
    setMappings(prev => [...prev, mapping]);
  }, []);

  const removeMapping = useCallback((id: string) => {
    setMappings(prev => prev.filter(m => m.id !== id));
  }, []);

  const updateMapping = useCallback((id: string, mapping: Mapping) => {
    setMappings(prev => prev.map(m => m.id === id ? mapping : m));
  }, []);

  // Mapping Task CRUD
  const addMappingTask = useCallback((task: MappingTask) => {
    setMappingTasks(prev => [...prev, task]);
  }, []);

  const removeMappingTask = useCallback((id: string) => {
    setMappingTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const updateMappingTask = useCallback((id: string, updates: Partial<MappingTask>) => {
    setMappingTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const isHostInUse = useCallback((hostName: string) => {
    const inDataSource = dataSource.definitions.some(d => d.host === hostName);

    // Check connections first
    const connectionsUsingHost = connections.filter(c => c.type === 'file' && c.host === hostName).map(c => c.id);

    const inCollection = collection.jobs.some(j =>
        (connectionsUsingHost.includes(j.sourceConnectionId)) ||
        (j.targetType === 'host' && j.targetConnectionId && connectionsUsingHost.includes(j.targetConnectionId))
    );
    const inDelivery = delivery.jobs.some(j =>
        (j.sourceType === 'host' && j.sourceConnectionId && connectionsUsingHost.includes(j.sourceConnectionId)) ||
        (j.targetConnectionId && connectionsUsingHost.includes(j.targetConnectionId))
    );

    const inEtl = etl.sourceHost === hostName;
    // const inConnections = connections.some(c => c.type === 'file' && c.host === hostName); // Already checked via connections usage

    return inDataSource || inCollection || inDelivery || inEtl || connectionsUsingHost.length > 0;
  }, [dataSource, collection, delivery, etl, connections]);

  const isDirectoryInUse = useCallback((hostName: string, path: string) => {
    const inDataSource = dataSource.definitions.some(d => d.host === hostName && d.path === path);

    const connectionsUsingDir = connections.filter(c => c.type === 'file' && c.host === hostName && c.path === path).map(c => c.id);

    const inCollection = collection.jobs.some(j =>
      (connectionsUsingDir.includes(j.sourceConnectionId)) ||
      (j.targetType === 'host' && j.targetConnectionId && connectionsUsingDir.includes(j.targetConnectionId))
    );
    const inDelivery = delivery.jobs.some(j =>
      (j.sourceType === 'host' && j.sourceConnectionId && connectionsUsingDir.includes(j.sourceConnectionId)) ||
      (j.targetConnectionId && connectionsUsingDir.includes(j.targetConnectionId))
    );
    const inEtl = etl.sourceHost === hostName && etl.sourcePath === path;
    // const inConnections = connections.some(c => c.type === 'file' && c.host === hostName && c.path === path);

    return inDataSource || inCollection || inDelivery || inEtl || connectionsUsingDir.length > 0;
  }, [dataSource, collection, delivery, etl, connections]);

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
        biDashboard,
        setBiDashboard,
        hosts,
        addHost,
        removeHost,
        addDirectory,
        removeDirectory,
        isHostInUse,
        isDirectoryInUse,
        topics,
        addTopic,
        removeTopic,
        updateTopic,
        tables,
        addTable,
        removeTable,
        addColumn,
        removeColumn,
        connections,
        addConnection,
        removeConnection,
        updateConnection,
        mappings,
        addMapping,
        removeMapping,
        updateMapping,
        mappingTasks,
        addMappingTask,
        removeMappingTask,
        updateMappingTask,
        saveSettings,
        applyIdempotencyTemplate,
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
