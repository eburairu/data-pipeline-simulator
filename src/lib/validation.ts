import type { DataSourceSettings, CollectionSettings, DeliverySettings, EtlSettings, DataSourceDefinition, GenerationJob, CollectionJob, DeliveryJob, Topic, ConnectionDefinition } from './SettingsContext';

export interface ValidationError {
  id?: string; // Job ID if applicable
  field: string;
  message: string;
}

const isValidRegex = (pattern: string): boolean => {
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
};

export const validateDataSourceDefinition = (def: DataSourceDefinition): ValidationError[] => {
  const errors: ValidationError[] = [];
  if (!def.name.trim()) errors.push({ id: def.id, field: 'name', message: 'Name is required' });
  if (!def.host) errors.push({ id: def.id, field: 'host', message: 'Host is required' });
  if (!def.path) errors.push({ id: def.id, field: 'path', message: 'Path is required' });
  return errors;
};

export const validateGenerationJob = (job: GenerationJob, definitions: DataSourceDefinition[]): ValidationError[] => {
  const errors: ValidationError[] = [];
  if (!job.name.trim()) errors.push({ id: job.id, field: 'name', message: 'Name is required' });
  if (!job.dataSourceId) errors.push({ id: job.id, field: 'dataSourceId', message: 'Target Data Source is required' });

  if (!definitions.some(d => d.id === job.dataSourceId)) {
     errors.push({ id: job.id, field: 'dataSourceId', message: 'Invalid Data Source Reference' });
  }

  if (job.executionInterval <= 0) errors.push({ id: job.id, field: 'executionInterval', message: 'Interval must be > 0' });
  if (!job.fileNamePattern.trim()) errors.push({ id: job.id, field: 'fileNamePattern', message: 'File Name Pattern is required' });

  if (job.mode === 'schema') {
    if ((job.rowCount ?? 0) <= 0) {
      errors.push({ id: job.id, field: 'rowCount', message: 'Row Count must be > 0' });
    }
    if (!job.schema || job.schema.length === 0) {
      errors.push({ id: job.id, field: 'schema', message: 'At least one column is required' });
    } else {
      job.schema.forEach((col) => {
        if (!col.name.trim()) {
          errors.push({ id: job.id, field: `schema`, message: 'Column Name is required' });
        }
      });
    }
  }

  return errors;
};

export const validateCollectionJob = (job: CollectionJob): ValidationError[] => {
  const errors: ValidationError[] = [];
  if (!job.name.trim()) errors.push({ id: job.id, field: 'name', message: 'Name is required' });

  if (!job.sourceConnectionId) errors.push({ id: job.id, field: 'sourceConnectionId', message: 'Source Connection is required' });

  if (job.targetType === 'topic') {
      if (!job.targetTopicId) errors.push({ id: job.id, field: 'targetTopicId', message: 'Target Topic is required' });
  } else {
      if (!job.targetConnectionId) errors.push({ id: job.id, field: 'targetConnectionId', message: 'Target Connection is required' });
  }

  if (job.bandwidth <= 0) errors.push({ id: job.id, field: 'bandwidth', message: 'Bandwidth must be > 0' });
  if (job.executionInterval <= 0) errors.push({ id: job.id, field: 'executionInterval', message: 'Interval must be > 0' });
  if (!isValidRegex(job.filterRegex)) errors.push({ id: job.id, field: 'filterRegex', message: 'Invalid Regular Expression' });
  return errors;
};

export const validateDeliveryJob = (job: DeliveryJob): ValidationError[] => {
  const errors: ValidationError[] = [];
  if (!job.name.trim()) errors.push({ id: job.id, field: 'name', message: 'Name is required' });

  if (job.sourceType === 'topic') {
      if (!job.sourceTopicId) errors.push({ id: job.id, field: 'sourceTopicId', message: 'Source Topic is required' });
  } else {
      if (!job.sourceConnectionId) errors.push({ id: job.id, field: 'sourceConnectionId', message: 'Source Connection is required' });
  }

  if (!job.targetConnectionId) errors.push({ id: job.id, field: 'targetConnectionId', message: 'Target Connection is required' });
  if (job.bandwidth <= 0) errors.push({ id: job.id, field: 'bandwidth', message: 'Bandwidth must be > 0' });
  if (job.executionInterval <= 0) errors.push({ id: job.id, field: 'executionInterval', message: 'Interval must be > 0' });
  if (job.processingTime < 0) errors.push({ id: job.id, field: 'processingTime', message: 'Latency cannot be negative' });
  if (!isValidRegex(job.filterRegex)) errors.push({ id: job.id, field: 'filterRegex', message: 'Invalid Regular Expression' });
  return errors;
};

export const validateEtlSettings = (settings: EtlSettings): ValidationError[] => {
  const errors: ValidationError[] = [];
  if (!settings.sourceHost) errors.push({ field: 'sourceHost', message: 'Source Host is required' });
  if (!settings.sourcePath) errors.push({ field: 'sourcePath', message: 'Source Path is required' });
  if (!settings.rawTableName.trim()) errors.push({ field: 'rawTableName', message: 'Raw Table Name is required' });
  if (!settings.summaryTableName.trim()) errors.push({ field: 'summaryTableName', message: 'Summary Table Name is required' });
  if (settings.executionInterval <= 0) errors.push({ field: 'executionInterval', message: 'Interval must be > 0' });
  if (settings.processingTime < 0) errors.push({ field: 'processingTime', message: 'Processing Time cannot be negative' });
  return errors;
};

export const validateTopic = (topic: Topic): ValidationError[] => {
    const errors: ValidationError[] = [];
    if (!topic.name.trim()) errors.push({ id: topic.id, field: 'name', message: 'Topic Name is required' });
    if (topic.retentionPeriod < 0) errors.push({ id: topic.id, field: 'retentionPeriod', message: 'Retention Period cannot be negative' });
    return errors;
};

export const validateConnection = (conn: ConnectionDefinition): ValidationError[] => {
    const errors: ValidationError[] = [];
    if (!conn.name.trim()) errors.push({ id: conn.id, field: 'name', message: 'Connection Name is required' });
    if (conn.type === 'file') {
        if (!conn.host) errors.push({ id: conn.id, field: 'host', message: 'Host is required' });
        if (!conn.path) errors.push({ id: conn.id, field: 'path', message: 'Path is required' });
    } else if (conn.type === 'database') {
        if (!conn.tableName) errors.push({ id: conn.id, field: 'tableName', message: 'Table Name is required' });
    }
    return errors;
};

export const validateAllSettings = (
  dataSource: DataSourceSettings,
  collection: CollectionSettings,
  delivery: DeliverySettings,
  etl: EtlSettings,
  topics: Topic[],
  connections: ConnectionDefinition[] = [] // Optional for backward compatibility if needed, but we pass it
): ValidationError[] => {
  let errors: ValidationError[] = [];

  dataSource.definitions.forEach(def => {
    errors = [...errors, ...validateDataSourceDefinition(def)];
  });

  dataSource.jobs.forEach(job => {
    errors = [...errors, ...validateGenerationJob(job, dataSource.definitions)];
  });

  if (collection.processingTime < 0) {
    errors.push({ field: 'collection.processingTime', message: 'Processing time cannot be negative' });
  }
  collection.jobs.forEach(job => {
    errors = [...errors, ...validateCollectionJob(job)];
  });

  delivery.jobs.forEach(job => {
    errors = [...errors, ...validateDeliveryJob(job)];
  });

  errors = [...errors, ...validateEtlSettings(etl)];

  topics.forEach(topic => {
      errors = [...errors, ...validateTopic(topic)];
  });

  connections.forEach(conn => {
      errors = [...errors, ...validateConnection(conn)];
  });

  return errors;
};
