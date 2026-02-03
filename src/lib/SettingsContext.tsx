import React, { createContext, useContext, useCallback, type ReactNode } from 'react';
import { validateAllSettings, type ValidationError } from './validation';
import { AVAILABLE_TEMPLATES, type PipelineTemplate } from './templates';

// Re-export types from the new centralized type definition file
export * from './types';
import {
  type DataSourceSettings, type CollectionSettings, type DeliverySettings, type EtlSettings,
  type BiDashboardSettings, type Host, type TopicDefinition, type TableDefinition,
  type ConnectionDefinition
} from './types';
import { type Mapping, type MappingTask, type TaskFlow } from './MappingTypes';

// Import new Context hooks and Providers
import { InfrastructureProvider, useInfrastructure } from './context/InfrastructureContext';
import { DataProvider, useData } from './context/DataContext';
import { PipelineProvider, usePipeline } from './context/PipelineContext';

interface SettingsContextType {
  dataSource: DataSourceSettings;
  setDataSource: React.Dispatch<React.SetStateAction<DataSourceSettings>>;
  collection: CollectionSettings;
  setCollection: React.Dispatch<React.SetStateAction<CollectionSettings>>;
  delivery: DeliverySettings;
  setDelivery: React.Dispatch<React.SetStateAction<DeliverySettings>>;
  etl: EtlSettings;
  setEtl: React.Dispatch<React.SetStateAction<EtlSettings>>;
  biDashboard: BiDashboardSettings;
  setBiDashboard: React.Dispatch<React.SetStateAction<BiDashboardSettings>>;

  hosts: Host[];
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

  taskFlows: TaskFlow[];
  addTaskFlow: (flow: TaskFlow) => void;
  removeTaskFlow: (id: string) => void;
  updateTaskFlow: (id: string, updates: Partial<TaskFlow>) => void;

  saveSettings: () => { success: boolean; errors?: ValidationError[] };
  availableTemplates: PipelineTemplate[];
  applyTemplate: (templateId: string) => void;
  cleanupTemplate: (templateId: string) => void;

  // Exposed setters for templates
  setHosts: React.Dispatch<React.SetStateAction<Host[]>>;
  setConnections: React.Dispatch<React.SetStateAction<ConnectionDefinition[]>>;
  setTables: React.Dispatch<React.SetStateAction<TableDefinition[]>>;
  setMappings: React.Dispatch<React.SetStateAction<Mapping[]>>;
  setMappingTasks: React.Dispatch<React.SetStateAction<MappingTask[]>>;
  setTaskFlows: React.Dispatch<React.SetStateAction<TaskFlow[]>>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Internal component that has access to all sub-contexts
const SettingsContextFacade: React.FC<{ children: ReactNode }> = ({ children }) => {
  const {
    hosts, addHost, removeHost, addDirectory, removeDirectory, setHosts,
    connections, addConnection, removeConnection, updateConnection, setConnections
  } = useInfrastructure();

  const {
    dataSource, setDataSource,
    topics, addTopic, removeTopic, updateTopic,
    tables, addTable, removeTable, addColumn, removeColumn, setTables,
    biDashboard, setBiDashboard
  } = useData();

  const {
    collection, setCollection,
    delivery, setDelivery,
    etl, setEtl,
    mappings, addMapping, removeMapping, updateMapping, setMappings,
    mappingTasks, addMappingTask, removeMappingTask, updateMappingTask, setMappingTasks,
    taskFlows, addTaskFlow, removeTaskFlow, updateTaskFlow, setTaskFlows
  } = usePipeline();

  const isHostInUse = useCallback((hostName: string) => {
    const inDataSource = dataSource.definitions.some(d => d.host === hostName);
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

    return inDataSource || inCollection || inDelivery || inEtl || connectionsUsingDir.length > 0;
  }, [dataSource, collection, delivery, etl, connections]);

  const saveSettings = useCallback(() => {
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
      mappingTasks,
      taskFlows
    };
    try {
      localStorage.setItem('pipeline-simulator-settings', JSON.stringify(settingsToSave));
      return { success: true };
    } catch (e) {
      console.error("Failed to save settings", e);
      return { success: false, errors: [{ field: 'storage', message: 'Failed to save to local storage' }] };
    }
  }, [dataSource, collection, delivery, etl, biDashboard, hosts, topics, tables, connections, mappings, mappingTasks, taskFlows]);

  const applyTemplate = useCallback((templateId: string) => {
    const template = AVAILABLE_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
      console.error(`Template ${templateId} not found`);
      return;
    }

    template.apply({
      setDataSource,
      setTables,
      setConnections,
      setMappings,
      setMappingTasks,
      setTaskFlows,
      setHosts
    });

    alert(`Template "${template.name}" applied successfully! Check the Simulation tab and relevant settings.`);
  }, [setDataSource, setTables, setConnections, setMappings, setMappingTasks, setTaskFlows, setHosts]); // Add deps

  const cleanupTemplate = useCallback((templateId: string) => {
    const template = AVAILABLE_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    template.cleanup({
      setDataSource,
      setTables,
      setConnections,
      setMappings,
      setMappingTasks,
      setTaskFlows,
      setHosts
    });

    alert(`Resources for template "${template.name}" have been removed.`);
  }, [setDataSource, setTables, setConnections, setMappings, setMappingTasks, setTaskFlows, setHosts]); // Add deps

  return (
    <SettingsContext.Provider value={{
      dataSource, setDataSource,
      collection, setCollection,
      delivery, setDelivery,
      etl, setEtl,
      biDashboard, setBiDashboard,
      hosts, addHost, removeHost, addDirectory, removeDirectory, isHostInUse, isDirectoryInUse,
      topics, addTopic, removeTopic, updateTopic,
      tables, addTable, removeTable, addColumn, removeColumn,
      connections, addConnection, removeConnection, updateConnection,
      mappings, addMapping, removeMapping, updateMapping,
      mappingTasks, addMappingTask, removeMappingTask, updateMappingTask,
      taskFlows, addTaskFlow, removeTaskFlow, updateTaskFlow,
      saveSettings,
      availableTemplates: AVAILABLE_TEMPLATES,
      applyTemplate,
      cleanupTemplate,
      // Exposed setters for templates
      setHosts, setConnections, setTables, setMappings, setMappingTasks, setTaskFlows
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <InfrastructureProvider>
      <DataProvider>
        <PipelineProvider>
          <SettingsContextFacade>
            {children}
          </SettingsContextFacade>
        </PipelineProvider>
      </DataProvider>
    </InfrastructureProvider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};