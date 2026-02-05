/**
 * パイプラインコンテキスト
 * コレクション・デリバリー・ETL設定、マッピング、タスクフローを管理する専門Context
 */
import React, { createContext, useContext, useState, type ReactNode, useCallback, useEffect } from 'react';
import { type Mapping, type MappingTask, type TaskFlow } from '../MappingTypes';
import { type CollectionSettings, type DeliverySettings, type EtlSettings } from '../types';

interface PipelineContextType {
  collection: CollectionSettings;
  setCollection: React.Dispatch<React.SetStateAction<CollectionSettings>>;
  delivery: DeliverySettings;
  setDelivery: React.Dispatch<React.SetStateAction<DeliverySettings>>;
  etl: EtlSettings;
  setEtl: React.Dispatch<React.SetStateAction<EtlSettings>>;

  mappings: Mapping[];
  addMapping: (mapping: Mapping) => void;
  removeMapping: (id: string) => void;
  updateMapping: (id: string, mapping: Mapping) => void;
  setMappings: React.Dispatch<React.SetStateAction<Mapping[]>>;

  mappingTasks: MappingTask[];
  addMappingTask: (task: MappingTask) => void;
  removeMappingTask: (id: string) => void;
  updateMappingTask: (id: string, updates: Partial<MappingTask>) => void;
  setMappingTasks: React.Dispatch<React.SetStateAction<MappingTask[]>>;

  taskFlows: TaskFlow[];
  addTaskFlow: (flow: TaskFlow) => void;
  removeTaskFlow: (id: string) => void;
  updateTaskFlow: (id: string, updates: Partial<TaskFlow>) => void;
  setTaskFlows: React.Dispatch<React.SetStateAction<TaskFlow[]>>;
}

const PipelineContext = createContext<PipelineContextType | undefined>(undefined);

export const PipelineProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [collection, setCollection] = useState<CollectionSettings>({
    jobs: [
      {
        id: 'col_job_1',
        name: 'Default Collection',
        sourceConnectionId: 'conn_src_host1',
        sourcePath: '/source',
        filterRegex: '.*',
        targetType: 'host',
        targetConnectionId: 'conn_incoming',
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
        sourceType: 'host',
        sourceConnectionId: 'conn_incoming',
        sourcePath: '/incoming',
        targetConnectionId: 'conn_internal',
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

  const [taskFlows, setTaskFlows] = useState<TaskFlow[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('pipeline-simulator-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.collection) {
            // Migration logic
             const migratedJobs = parsed.collection.jobs.map((job: { targetType?: string, sourceHost?: string }) => {
                const newJob = { ...job, targetType: job.targetType || 'host' };
                return newJob;
            });
            setCollection({ ...parsed.collection, jobs: migratedJobs });
        }
        if (parsed.delivery) {
             const migratedJobs = parsed.delivery.jobs.map((job: { sourceType?: string }) => {
                return { ...job, sourceType: job.sourceType || 'host' };
            });
            setDelivery({ ...parsed.delivery, jobs: migratedJobs });
        }
        if (parsed.etl) setEtl(parsed.etl);
        if (parsed.mappings) setMappings(parsed.mappings);
        if (parsed.mappingTasks) setMappingTasks(parsed.mappingTasks);
        if (parsed.taskFlows) setTaskFlows(parsed.taskFlows);
      } catch (e) {
        console.error('Failed to load pipeline settings', e);
      }
    }
  }, []);

  const addMapping = useCallback((mapping: Mapping) => {
    setMappings(prev => [...prev, mapping]);
  }, []);

  const removeMapping = useCallback((id: string) => {
    setMappings(prev => prev.filter(m => m.id !== id));
  }, []);

  const updateMapping = useCallback((id: string, mapping: Mapping) => {
    setMappings(prev => prev.map(m => m.id === id ? mapping : m));
  }, []);

  const addMappingTask = useCallback((task: MappingTask) => {
    setMappingTasks(prev => [...prev, task]);
  }, []);

  const removeMappingTask = useCallback((id: string) => {
    setMappingTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const updateMappingTask = useCallback((id: string, updates: Partial<MappingTask>) => {
    setMappingTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const addTaskFlow = useCallback((flow: TaskFlow) => {
    setTaskFlows(prev => [...prev, flow]);
  }, []);

  const removeTaskFlow = useCallback((id: string) => {
    setTaskFlows(prev => prev.filter(f => f.id !== id));
  }, []);

  const updateTaskFlow = useCallback((id: string, updates: Partial<TaskFlow>) => {
    setTaskFlows(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  }, []);

  return (
    <PipelineContext.Provider value={{
      collection, setCollection,
      delivery, setDelivery,
      etl, setEtl,
      mappings, addMapping, removeMapping, updateMapping, setMappings,
      mappingTasks, addMappingTask, removeMappingTask, updateMappingTask, setMappingTasks,
      taskFlows, addTaskFlow, removeTaskFlow, updateTaskFlow, setTaskFlows
    }}>
      {children}
    </PipelineContext.Provider>
  );
};

export const usePipeline = () => {
  const context = useContext(PipelineContext);
  if (context === undefined) {
    throw new Error('usePipeline must be used within a PipelineProvider');
  }
  return context;
};
