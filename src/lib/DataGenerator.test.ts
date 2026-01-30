import { describe, it, expect } from 'vitest';
import { generateDataFromSchema } from './DataGenerator';
import { type ColumnSchema } from './SettingsContext';
import { type TemplateContext } from './templateUtils';

describe('generateDataFromSchema', () => {
  const context: TemplateContext = {
    hostname: 'test-host',
    timestamp: new Date('2023-01-01T00:00:00.000Z'),
  };

  it('should generate empty string if schema is empty', () => {
    const result = generateDataFromSchema([], 1, context);
    expect(result).toBe('');
  });

  it('should generate header and rows', () => {
    const schema: ColumnSchema[] = [
      { id: '1', name: 'col1', type: 'static', params: { value: 'A' } },
      { id: '2', name: 'col2', type: 'static', params: { value: 'B' } },
    ];
    const result = generateDataFromSchema(schema, 2, context);
    const lines = result.split('\n');
    expect(lines.length).toBe(3); // Header + 2 rows
    expect(lines[0]).toBe('col1,col2');
    expect(lines[1]).toBe('A,B');
    expect(lines[2]).toBe('A,B');
  });

  it('should handle sequence generator', () => {
    const schema: ColumnSchema[] = [
      { id: '1', name: 'seq', type: 'sequence', params: { start: 10, step: 5 } },
    ];
    const result = generateDataFromSchema(schema, 3, context);
    const lines = result.split('\n');
    expect(lines[1]).toBe('10');
    expect(lines[2]).toBe('15');
    expect(lines[3]).toBe('20');
  });

  it('should handle randomInt generator', () => {
    const schema: ColumnSchema[] = [
      { id: '1', name: 'rnd', type: 'randomInt', params: { min: 10, max: 20 } },
    ];
    const result = generateDataFromSchema(schema, 10, context);
    const lines = result.split('\n').slice(1);
    lines.forEach(line => {
      const val = parseInt(line);
      expect(val).toBeGreaterThanOrEqual(10);
      expect(val).toBeLessThanOrEqual(20);
    });
  });

  it('should handle static with template', () => {
      const schema: ColumnSchema[] = [
          { id: '1', name: 'host', type: 'static', params: { value: '${host}' } },
      ];
      const result = generateDataFromSchema(schema, 1, context);
      expect(result.split('\n')[1]).toBe('test-host');
  });

  it('should handle list generator', () => {
      const schema: ColumnSchema[] = [
          { id: '1', name: 'choice', type: 'list', params: { values: 'A,B,C' } },
      ];
      const result = generateDataFromSchema(schema, 20, context);
      const lines = result.split('\n').slice(1);
      const allowed = new Set(['A', 'B', 'C']);
      lines.forEach(line => {
          expect(allowed.has(line)).toBe(true);
      });
  });

  it('should handle uuid generator', () => {
    const schema: ColumnSchema[] = [
        { id: '1', name: 'uid', type: 'uuid', params: {} },
    ];
    const result = generateDataFromSchema(schema, 5, context);
    const lines = result.split('\n').slice(1);
    const unique = new Set(lines);
    expect(unique.size).toBe(5); // All UUIDs should be unique
    expect(lines[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('should handle sin generator', () => {
      // Period 1000ms. At t=0, sin(0)=0. At t=250, sin(PI/2)=1.
      const schema: ColumnSchema[] = [
          { id: '1', name: 'val', type: 'sin', params: { period: 1000, amplitude: 10 } },
      ];

      // t=0
      let ctx = { ...context, timestamp: new Date(0) };
      let res = generateDataFromSchema(schema, 1, ctx);
      expect(res.split('\n')[1]).toBe('0.0000'); // 10 * 0

      // t=250
      ctx = { ...context, timestamp: new Date(250) };
      res = generateDataFromSchema(schema, 1, ctx);
      expect(res.split('\n')[1]).toBe('10.0000'); // 10 * 1
  });
});
