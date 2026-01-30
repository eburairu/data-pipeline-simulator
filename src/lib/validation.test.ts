import { describe, it, expect } from 'vitest';
import { validateCollectionJob, validateDeliveryJob, validateGenerationJob } from './validation';
import type { CollectionJob, DeliveryJob, GenerationJob, DataSourceDefinition } from './SettingsContext';

describe('Validation Logic', () => {
  describe('GenerationJob Validation', () => {
    const definitions: DataSourceDefinition[] = [
      { id: 'ds1', name: 'DS1', host: 'h1', path: '/p1' }
    ];
    const baseJob: GenerationJob = {
      id: 'job1',
      name: 'Gen Job',
      dataSourceId: 'ds1',
      fileNamePattern: 'file.csv',
      fileContent: '',
      mode: 'template',
      executionInterval: 1000,
      enabled: true
    };

    it('should validate valid template mode', () => {
      expect(validateGenerationJob(baseJob, definitions)).toHaveLength(0);
    });

    it('should validate valid schema mode', () => {
      const job: GenerationJob = {
        ...baseJob,
        mode: 'schema',
        rowCount: 10,
        schema: [{ id: '1', name: 'col1', type: 'static', params: { value: 'a' } }]
      };
      expect(validateGenerationJob(job, definitions)).toHaveLength(0);
    });

    it('should fail if rowCount <= 0 in schema mode', () => {
      const job: GenerationJob = {
        ...baseJob,
        mode: 'schema',
        rowCount: 0,
        schema: [{ id: '1', name: 'col1', type: 'static', params: { value: 'a' } }]
      };
      const errors = validateGenerationJob(job, definitions);
      expect(errors.some(e => e.field === 'rowCount')).toBe(true);
    });

    it('should fail if schema is empty in schema mode', () => {
      const job: GenerationJob = {
        ...baseJob,
        mode: 'schema',
        rowCount: 1,
        schema: []
      };
      const errors = validateGenerationJob(job, definitions);
      expect(errors.some(e => e.field === 'schema')).toBe(true);
    });

    it('should fail if column name is empty', () => {
      const job: GenerationJob = {
        ...baseJob,
        mode: 'schema',
        rowCount: 1,
        schema: [{ id: '1', name: '', type: 'static', params: {} }]
      };
      const errors = validateGenerationJob(job, definitions);
      expect(errors.some(e => e.message === 'Column Name is required')).toBe(true);
    });
  });

  describe('CollectionJob Validation', () => {
    const baseJob: CollectionJob = {
      id: 'job1',
      name: 'Test Job',
      sourceHost: 'srcHost',
      sourcePath: '/src',
      filterRegex: '.*',
      bandwidth: 100,
      renamePattern: '',
      executionInterval: 1000,
      enabled: true,
      targetType: 'host',
      targetHost: 'tgtHost',
      targetPath: '/tgt'
    };

    it('should validate valid host target job', () => {
      expect(validateCollectionJob(baseJob)).toHaveLength(0);
    });

    it('should fail if targetHost is missing for host type', () => {
      const job = { ...baseJob, targetHost: '' };
      const errors = validateCollectionJob(job);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('targetHost');
    });

    it('should validate valid topic target job', () => {
      const job: CollectionJob = {
        ...baseJob,
        targetType: 'topic',
        targetTopicId: 'topic1',
        targetHost: '', // Should be ignored
        targetPath: ''  // Should be ignored
      };
      expect(validateCollectionJob(job)).toHaveLength(0);
    });

    it('should fail if targetTopicId is missing for topic type', () => {
      const job: CollectionJob = {
        ...baseJob,
        targetType: 'topic',
        targetTopicId: '',
      };
      const errors = validateCollectionJob(job);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('targetTopicId');
    });
  });

  describe('DeliveryJob Validation', () => {
    const baseJob: DeliveryJob = {
      id: 'job1',
      name: 'Test Job',
      sourceType: 'host',
      sourceHost: 'srcHost',
      sourcePath: '/src',
      targetHost: 'tgtHost',
      targetPath: '/tgt',
      filterRegex: '.*',
      bandwidth: 100,
      processingTime: 100,
      executionInterval: 1000,
      enabled: true
    };

    it('should validate valid host source job', () => {
      expect(validateDeliveryJob(baseJob)).toHaveLength(0);
    });

    it('should fail if sourceHost is missing for host type', () => {
      const job = { ...baseJob, sourceHost: '' };
      const errors = validateDeliveryJob(job);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('sourceHost');
    });

    it('should validate valid topic source job', () => {
      const job: DeliveryJob = {
        ...baseJob,
        sourceType: 'topic',
        sourceTopicId: 'topic1',
        sourceHost: '', // Should be ignored
        sourcePath: ''  // Should be ignored
      };
      expect(validateDeliveryJob(job)).toHaveLength(0);
    });

    it('should fail if sourceTopicId is missing for topic type', () => {
      const job: DeliveryJob = {
        ...baseJob,
        sourceType: 'topic',
        sourceTopicId: '',
      };
      const errors = validateDeliveryJob(job);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('sourceTopicId');
    });
  });
});
