import { describe, it, expect } from 'vitest';
import { processTemplate } from './templateUtils';

describe('templateUtils', () => {
  const context = {
    hostname: 'test-host',
    timestamp: new Date('2023-10-27T10:00:00.123Z'),
    collectionHost: 'dest-host',
    fileName: 'original.csv'
  };

  it('should replace hostname', () => {
    expect(processTemplate('file_${hostname}.csv', context)).toBe('file_test-host.csv');
    expect(processTemplate('file_${host}.csv', context)).toBe('file_test-host.csv');
  });

  it('should replace timestamp with default format', () => {
    // Default format is YYYYMMDDHHmmss (local time)
    const result = processTemplate('file_${timestamp}.csv', context);
    expect(result).toMatch(/file_\d{14}\.csv/);
  });

  it('should replace timestamp with specified format', () => {
    const result = processTemplate('file_${timestamp:YYYY-MM-DD}.csv', context);
    expect(result).toMatch(/file_\d{4}-\d{2}-\d{2}\.csv/);
  });

  it('should handle complex patterns', () => {
    const result = processTemplate('${host}_data_${timestamp:HHmm}.txt', context);
    expect(result).toMatch(/test-host_data_\d{4}\.txt/);
  });

  it('should ignore unknown variables', () => {
    expect(processTemplate('val_${unknown}', context)).toBe('val_${unknown}');
  });

  it('should handle milliseconds', () => {
     const result = processTemplate('${timestamp:SSS}', context);
     expect(result).toBe('123');
  });

  it('should replace collectionHost', () => {
    expect(processTemplate('to_${collectionHost}.csv', context)).toBe('to_dest-host.csv');
  });

  it('should replace fileName', () => {
    expect(processTemplate('copy_${fileName}', context)).toBe('copy_original.csv');
  });

  it('should handle missing optional fields gracefully', () => {
    const minimalContext = {
      hostname: 'test-host',
      timestamp: new Date()
    };
    expect(processTemplate('to_${collectionHost}.csv', minimalContext)).toBe('to_.csv');
    expect(processTemplate('copy_${fileName}', minimalContext)).toBe('copy_');
  });
});
