import { describe, it, expect } from 'vitest';
import { validateCollectionJob, validateDeliveryJob } from './validation';
import type { CollectionJob, DeliveryJob } from './SettingsContext';

describe('Validation Logic', () => {
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
