import type { DataSourceSettings, CollectionSettings, DeliverySettings, EtlSettings, GenerationJob, CollectionJob, DeliveryJob, Topic, ConnectionDefinition } from './SettingsContext';

export interface ValidationError {
  id?: string; // Job ID if applicable
  field: string;
  message: string;
  section?: string;   // セクション名（タブ名）
  itemName?: string;  // ジョブ名やアイテム名
}

const isValidRegex = (pattern: string): boolean => {
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
};

export const validateGenerationJob = (job: GenerationJob): ValidationError[] => {
  const errors: ValidationError[] = [];
  if (!job.name.trim()) errors.push({ id: job.id, field: 'name', message: 'Name is required' });
  if (!job.connectionId) errors.push({ id: job.id, field: 'connectionId', message: 'Target Connection is required' });
  if (!job.path) errors.push({ id: job.id, field: 'path', message: 'Target Path is required' });

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
  if (!job.sourcePath || !job.sourcePath.trim()) errors.push({ id: job.id, field: 'sourcePath', message: 'Source Path is required' });

  if (job.targetType === 'topic') {
      if (!job.targetTopicId) errors.push({ id: job.id, field: 'targetTopicId', message: 'Target Topic is required' });
  } else {
      if (!job.targetConnectionId) errors.push({ id: job.id, field: 'targetConnectionId', message: 'Target Connection is required' });
      if (!job.targetPath || !job.targetPath.trim()) errors.push({ id: job.id, field: 'targetPath', message: 'Target Path is required' });
  }

  if (job.bandwidth <= 0) errors.push({ id: job.id, field: 'bandwidth', message: 'Bandwidth must be > 0' });
  if (job.executionInterval <= 0) errors.push({ id: job.id, field: 'executionInterval', message: 'Interval must be > 0' });
  if (!isValidRegex(job.filterRegex)) errors.push({ id: job.id, field: 'filterRegex', message: 'Invalid Regular Expression' });

  // Phase 1: リトライ設定のバリデーション
  if (job.retryConfig) {
    if (job.retryConfig.maxRetries < 0) errors.push({ id: job.id, field: 'retryConfig.maxRetries', message: 'Max Retries must be >= 0' });
    if (job.retryConfig.retryDelayMs < 0) errors.push({ id: job.id, field: 'retryConfig.retryDelayMs', message: 'Retry Delay must be >= 0' });
    if (job.retryConfig.backoffMultiplier !== undefined && job.retryConfig.backoffMultiplier < 1) {
      errors.push({ id: job.id, field: 'retryConfig.backoffMultiplier', message: 'Backoff Multiplier must be >= 1' });
    }
  }

  // Phase 2-4: 追加機能のバリデーション（基本的なチェックのみ）
  if (job.parallelBatchSize !== undefined && job.parallelBatchSize < 1) {
    errors.push({ id: job.id, field: 'parallelBatchSize', message: 'Parallel Batch Size must be >= 1' });
  }

  if (job.cdcEnabled && job.cdcConfig && !job.cdcConfig.sourceTableId) {
    errors.push({ id: job.id, field: 'cdcConfig.sourceTableId', message: 'CDC Source Table is required when CDC is enabled' });
  }

  return errors;
};

export const validateDeliveryJob = (job: DeliveryJob): ValidationError[] => {
  const errors: ValidationError[] = [];
  if (!job.name.trim()) errors.push({ id: job.id, field: 'name', message: 'Name is required' });

  if (job.sourceType === 'topic') {
      if (!job.sourceTopicId) errors.push({ id: job.id, field: 'sourceTopicId', message: 'Source Topic is required' });
  } else {
      if (!job.sourceConnectionId) errors.push({ id: job.id, field: 'sourceConnectionId', message: 'Source Connection is required' });
      if (!job.sourcePath || !job.sourcePath.trim()) errors.push({ id: job.id, field: 'sourcePath', message: 'Source Path is required' });
  }

  if (!job.targetConnectionId) errors.push({ id: job.id, field: 'targetConnectionId', message: 'Target Connection is required' });
  if (!job.targetPath || !job.targetPath.trim()) errors.push({ id: job.id, field: 'targetPath', message: 'Target Path is required' });
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
    if (!conn.host) errors.push({ id: conn.id, field: 'host', message: 'Host is required' });
    return errors;
};

// エラーにセクション情報を付与するヘルパー関数
const addSectionInfo = (
  errors: ValidationError[],
  section: string,
  itemName?: string
): ValidationError[] => {
  return errors.map(err => ({ ...err, section, itemName: itemName || err.itemName }));
};

export const validateAllSettings = (
  dataSource: DataSourceSettings,
  collection: CollectionSettings,
  delivery: DeliverySettings,
  etl: EtlSettings,
  topics: Topic[],
  connections: ConnectionDefinition[] = []
): ValidationError[] => {
  let errors: ValidationError[] = [];

  // Data Source (File Generation)
  dataSource.jobs.forEach(job => {
    const jobErrors = validateGenerationJob(job);
    errors = [...errors, ...addSectionInfo(jobErrors, 'Data Source', job.name)];
  });

  // Collection
  if (collection.processingTime < 0) {
    errors.push({ field: 'processingTime', message: 'Processing time cannot be negative', section: 'Collection' });
  }
  collection.jobs.forEach(job => {
    const jobErrors = validateCollectionJob(job);
    errors = [...errors, ...addSectionInfo(jobErrors, 'Collection', job.name)];
  });

  // Delivery
  delivery.jobs.forEach(job => {
    const jobErrors = validateDeliveryJob(job);
    errors = [...errors, ...addSectionInfo(jobErrors, 'Delivery', job.name)];
  });

  // ETL
  const etlErrors = validateEtlSettings(etl);
  errors = [...errors, ...addSectionInfo(etlErrors, 'ETL')];

  // Topics
  topics.forEach(topic => {
    const topicErrors = validateTopic(topic);
    errors = [...errors, ...addSectionInfo(topicErrors, 'Topics', topic.name)];
  });

  // Connections
  connections.forEach(conn => {
    const connErrors = validateConnection(conn);
    errors = [...errors, ...addSectionInfo(connErrors, 'Connections', conn.name)];
  });

  return errors;
};
