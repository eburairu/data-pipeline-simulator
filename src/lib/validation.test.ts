import { describe, it, expect } from 'vitest';
import { validateCollectionJob, validateDeliveryJob, validateGenerationJob } from './validation';
import type { CollectionJob, DeliveryJob, GenerationJob } from './SettingsContext';

describe('Validation Logic', () => {
  describe('GenerationJob Validation', () => {
    const baseJob: GenerationJob = {
      id: 'job1',
      name: 'Gen Job',
      connectionId: 'conn1',
      path: '/p1',
      fileNamePattern: 'file.csv',
      fileContent: '',
      mode: 'template',
      executionInterval: 1000,
      enabled: true
    };

    it('should validate valid template mode', () => {
      expect(validateGenerationJob(baseJob)).toHaveLength(0);
    });

    it('should validate valid schema mode', () => {
      const job: GenerationJob = {
        ...baseJob,
        mode: 'schema',
        rowCount: 10,
        schema: [{ id: '1', name: 'col1', type: 'static', params: { value: 'a' } }]
      };
      expect(validateGenerationJob(job)).toHaveLength(0);
    });

    it('should fail if rowCount <= 0 in schema mode', () => {
      const job: GenerationJob = {
        ...baseJob,
        mode: 'schema',
        rowCount: 0,
        schema: [{ id: '1', name: 'col1', type: 'static', params: { value: 'a' } }]
      };
      const errors = validateGenerationJob(job);
      expect(errors.some(e => e.field === 'rowCount')).toBe(true);
    });

    it('should fail if schema is empty in schema mode', () => {
      const job: GenerationJob = {
        ...baseJob,
        mode: 'schema',
        rowCount: 1,
        schema: []
      };
      const errors = validateGenerationJob(job);
      expect(errors.some(e => e.field === 'schema')).toBe(true);
    });

    it('should fail if column name is empty', () => {
      const job: GenerationJob = {
        ...baseJob,
        mode: 'schema',
        rowCount: 1,
        schema: [{ id: '1', name: '', type: 'static', params: {} }]
      };
      const errors = validateGenerationJob(job);
      expect(errors.some(e => e.message === 'Column Name is required')).toBe(true);
    });
  });

  describe('CollectionJob Validation', () => {
    const baseJob: CollectionJob = {
      id: 'job1',
      name: 'Test Job',
      sourceConnectionId: 'conn1',
      sourcePath: '/data',
      filterRegex: '.*',
      bandwidth: 100,
      renamePattern: '',
      executionInterval: 1000,
      enabled: true,
      targetType: 'host',
      targetConnectionId: 'conn2',
      targetPath: '/output',
    };

    it('should validate valid host target job', () => {
      expect(validateCollectionJob(baseJob)).toHaveLength(0);
    });

    it('should fail if targetConnectionId is missing for host type', () => {
      const job = { ...baseJob, targetConnectionId: '' };
      const errors = validateCollectionJob(job);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('targetConnectionId');
    });

    it('should validate valid topic target job', () => {
      const job: CollectionJob = {
        ...baseJob,
        targetType: 'topic',
        targetTopicId: 'topic1',
        targetConnectionId: '', // Should be ignored
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
      sourceConnectionId: 'conn1',
      sourcePath: '/data',
      targetConnectionId: 'conn2',
      targetPath: '/output',
      filterRegex: '.*',
      bandwidth: 100,
      processingTime: 100,
      executionInterval: 1000,
      enabled: true
    };

    it('should validate valid host source job', () => {
      expect(validateDeliveryJob(baseJob)).toHaveLength(0);
    });

    it('should fail if sourceConnectionId is missing for host type', () => {
      const job = { ...baseJob, sourceConnectionId: '' };
      const errors = validateDeliveryJob(job);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('sourceConnectionId');
    });

    it('should validate valid topic source job', () => {
      const job: DeliveryJob = {
        ...baseJob,
        sourceType: 'topic',
        sourceTopicId: 'topic1',
        sourceConnectionId: '', // Should be ignored
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
