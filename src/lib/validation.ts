import type { DataSourceSettings, CollectionSettings, DeliverySettings, EtlSettings, DataSourceJob, CollectionJob, DeliveryJob } from './SettingsContext';

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

export const validateDataSourceJob = (job: DataSourceJob): ValidationError[] => {
  const errors: ValidationError[] = [];
  if (!job.name.trim()) errors.push({ id: job.id, field: 'name', message: 'Name is required' });
  if (!job.host) errors.push({ id: job.id, field: 'host', message: 'Host is required' });
  if (!job.sourcePath) errors.push({ id: job.id, field: 'sourcePath', message: 'Source Path is required' });
  if (job.executionInterval <= 0) errors.push({ id: job.id, field: 'executionInterval', message: 'Interval must be > 0' });
  if (!job.fileNamePattern.trim()) errors.push({ id: job.id, field: 'fileNamePattern', message: 'File Name Pattern is required' });
  return errors;
};

export const validateCollectionJob = (job: CollectionJob): ValidationError[] => {
  const errors: ValidationError[] = [];
  if (!job.name.trim()) errors.push({ id: job.id, field: 'name', message: 'Name is required' });
  if (!job.sourceHost) errors.push({ id: job.id, field: 'sourceHost', message: 'Source Host is required' });
  if (!job.sourcePath) errors.push({ id: job.id, field: 'sourcePath', message: 'Source Path is required' });
  if (!job.targetHost) errors.push({ id: job.id, field: 'targetHost', message: 'Target Host is required' });
  if (!job.targetPath) errors.push({ id: job.id, field: 'targetPath', message: 'Target Path is required' });
  if (job.bandwidth <= 0) errors.push({ id: job.id, field: 'bandwidth', message: 'Bandwidth must be > 0' });
  if (job.executionInterval <= 0) errors.push({ id: job.id, field: 'executionInterval', message: 'Interval must be > 0' });
  if (!isValidRegex(job.filterRegex)) errors.push({ id: job.id, field: 'filterRegex', message: 'Invalid Regular Expression' });
  return errors;
};

export const validateDeliveryJob = (job: DeliveryJob): ValidationError[] => {
  const errors: ValidationError[] = [];
  if (!job.name.trim()) errors.push({ id: job.id, field: 'name', message: 'Name is required' });
  if (!job.sourceHost) errors.push({ id: job.id, field: 'sourceHost', message: 'Source Host is required' });
  if (!job.sourcePath) errors.push({ id: job.id, field: 'sourcePath', message: 'Source Path is required' });
  if (!job.targetHost) errors.push({ id: job.id, field: 'targetHost', message: 'Target Host is required' });
  if (!job.targetPath) errors.push({ id: job.id, field: 'targetPath', message: 'Target Path is required' });
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

export const validateAllSettings = (
  dataSource: DataSourceSettings,
  collection: CollectionSettings,
  delivery: DeliverySettings,
  etl: EtlSettings
): ValidationError[] => {
  let errors: ValidationError[] = [];

  dataSource.jobs.forEach(job => {
    errors = [...errors, ...validateDataSourceJob(job)];
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

  return errors;
};
