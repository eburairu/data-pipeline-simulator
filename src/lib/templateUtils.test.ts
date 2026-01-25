import { describe, it, expect } from 'vitest';
import { processTemplate } from './templateUtils';

describe('templateUtils', () => {
  const context = {
    hostname: 'test-host',
    timestamp: new Date('2023-10-27T10:00:00.123Z'),
  };

  it('should replace hostname', () => {
    expect(processTemplate('file_${hostname}.csv', context)).toBe('file_test-host.csv');
    expect(processTemplate('file_${host}.csv', context)).toBe('file_test-host.csv');
  });

  it('should replace timestamp with default format', () => {
    // Default format is YYYYMMDDHHmmss (local time)
    // Note: The test environment might have different timezone.
    // We should rely on formatDate logic or mock the date, but simple regex check works too.
    const result = processTemplate('file_${timestamp}.csv', context);
    expect(result).toMatch(/file_\d{14}\.csv/);
  });

  it('should replace timestamp with specified format', () => {
    // Since we use getFullYear etc, it depends on local time.
    // Let's verify the format structure matches.
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
     // 123 is the ms in our date, but again, local time vs UTC might shift day/hour, ms should be same?
     // Actually Date.getMilliseconds() returns local ms? No, ms is timezone independent usually unless we cross boundaries, wait.
     // new Date('...Z') creates a UTC date. getMilliseconds() returns the ms part.
     expect(result).toBe('123');
  });
});
