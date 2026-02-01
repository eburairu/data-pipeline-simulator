// Shared Type Definitions

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
  params: Record<string, string | number | boolean | string[] | number[]>;
}

export interface GenerationJob {
  id: string;
  name: string;
  dataSourceId: string;
  fileNamePattern: string;
  fileContent: string;
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
  retentionPeriod: number;
}

export type Topic = TopicDefinition;

export interface CollectionJob {
  id: string;
  name: string;
  sourceConnectionId: string;
  filterRegex: string;
  targetType?: 'host' | 'topic';
  targetConnectionId?: string;
  targetTopicId?: string;
  bandwidth: number;
  renamePattern: string;
  executionInterval: number;
  enabled: boolean;
  processingTime?: number;
  triggerSubscriptions?: boolean;
}

export interface CollectionSettings {
  jobs: CollectionJob[];
  processingTime: number;
}

export interface DeliveryJob {
  id: string;
  name: string;
  sourceType?: 'host' | 'topic';
  sourceConnectionId?: string;
  sourceTopicId?: string;
  targetConnectionId: string;
  filterRegex: string;
  bandwidth: number;
  processingTime: number;
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
  type: string;
}

export interface TableDefinition {
  id: string;
  name: string;
  columns: ColumnDefinition[];
}

export type ConnectionType = 'file' | 'database';

export interface ConnectionDefinition {
  id: string;
  name: string;
  type: ConnectionType;
  host?: string;
  path?: string;
  databaseName?: string;
  tableName?: string;
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