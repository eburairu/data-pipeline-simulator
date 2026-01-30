import { type ColumnSchema } from './SettingsContext';
import { type TemplateContext, processTemplate } from './templateUtils';

export const generateDataFromSchema = (
  schema: ColumnSchema[],
  rowCount: number,
  context: TemplateContext
): string => {
  if (!schema || schema.length === 0) return '';

  const header = schema.map(col => col.name).join(',');
  const rows: string[] = [];

  for (let i = 0; i < rowCount; i++) {
    const row = schema.map(col => generateValue(col, i, context)).join(',');
    rows.push(row);
  }

  return [header, ...rows].join('\n');
};

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const generateValue = (col: ColumnSchema, rowIndex: number, context: TemplateContext): string => {
  const { type, params } = col;

  switch (type) {
    case 'static': {
      const val = params.value !== undefined ? String(params.value) : '';
      return processTemplate(val, context);
    }
    case 'randomInt': {
      const min = Number(params.min) || 0;
      const max = Number(params.max) || 100;
      return String(Math.floor(Math.random() * (max - min + 1)) + min);
    }
    case 'randomFloat': {
      const min = Number(params.min) || 0;
      const max = Number(params.max) || 1;
      const precision = params.precision !== undefined ? Number(params.precision) : 2;
      const val = Math.random() * (max - min) + min;
      return val.toFixed(precision);
    }
    case 'sin': {
      const period = Number(params.period) || 10000; // default 10s
      const amplitude = Number(params.amplitude) || 1;
      const offset = Number(params.offset) || 0;
      // Use timestamp for continuity
      const t = context.timestamp.getTime();
      const val = amplitude * Math.sin(2 * Math.PI * (t / period)) + offset;
      return val.toFixed(4);
    }
    case 'cos': {
      const period = Number(params.period) || 10000;
      const amplitude = Number(params.amplitude) || 1;
      const offset = Number(params.offset) || 0;
      const t = context.timestamp.getTime();
      const val = amplitude * Math.cos(2 * Math.PI * (t / period)) + offset;
      return val.toFixed(4);
    }
    case 'sequence': {
        const start = Number(params.start) || 1;
        const step = Number(params.step) || 1;
        return String(start + (step * rowIndex));
    }
    case 'uuid': {
        return generateUUID();
    }
    case 'list': {
        const listStr = String(params.values || '');
        const items = listStr.split(',').map(s => s.trim()).filter(s => s.length > 0);
        if (items.length === 0) return '';
        const item = items[Math.floor(Math.random() * items.length)];
        return item;
    }
    default:
      return '';
  }
};
