import { type ColumnSchema } from './SettingsContext';
import { type TemplateContext, processTemplate } from './templateUtils';

export const generateDataFromSchema = (
  schema: ColumnSchema[],
  rowCount: number,
  context: TemplateContext,
  sequenceState: Record<string, number> = {}
): { content: string, nextSequenceState: Record<string, number> } => {
  if (!schema || schema.length === 0) return { content: '', nextSequenceState: sequenceState };

  const header = schema.map(col => col.name).join(',');
  const rows: string[] = [];

  // Create a mutable copy of the state to track changes during this batch
  const currentSequenceState = { ...sequenceState };

  // Create generators for each column once
  const generators = schema.map(col => createValueGenerator(col, context));

  for (let i = 0; i < rowCount; i++) {
    const rowValues = generators.map((gen, index) => {
        const colId = schema[index].id;
        const { value, nextSeq } = gen(i, currentSequenceState[colId]);
        if (nextSeq !== undefined) {
            currentSequenceState[colId] = nextSeq;
        }
        return value;
    });
    rows.push(rowValues.join(','));
  }

  return {
      content: [header, ...rows].join('\n'),
      nextSequenceState: currentSequenceState
  };
};

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

type ValueGenerator = (rowIndex: number, lastSequenceValue?: number) => { value: string, nextSeq?: number };

const createValueGenerator = (
    col: ColumnSchema,
    context: TemplateContext
): ValueGenerator => {
  const { type, params } = col;

  switch (type) {
    case 'static': {
      const val = params.value !== undefined ? String(params.value) : '';
      const processed = processTemplate(val, context);
      return () => ({ value: processed });
    }
    case 'randomInt': {
      const min = Number(params.min) || 0;
      const max = Number(params.max) || 100;
      return () => ({ value: String(Math.floor(Math.random() * (max - min + 1)) + min) });
    }
    case 'randomFloat': {
      const min = Number(params.min) || 0;
      const max = Number(params.max) || 1;
      const precision = params.precision !== undefined ? Number(params.precision) : 2;
      return () => {
        const val = Math.random() * (max - min) + min;
        return { value: val.toFixed(precision) };
      };
    }
    case 'sin': {
      const period = Number(params.period) || 10000; // default 10s
      const amplitude = Number(params.amplitude) || 1;
      const offset = Number(params.offset) || 0;
      // Use timestamp for continuity
      const t = context.timestamp.getTime();
      const val = amplitude * Math.sin(2 * Math.PI * (t / period)) + offset;
      const fixedVal = val.toFixed(4);
      return () => ({ value: fixedVal });
    }
    case 'cos': {
      const period = Number(params.period) || 10000;
      const amplitude = Number(params.amplitude) || 1;
      const offset = Number(params.offset) || 0;
      const t = context.timestamp.getTime();
      const val = amplitude * Math.cos(2 * Math.PI * (t / period)) + offset;
      const fixedVal = val.toFixed(4);
      return () => ({ value: fixedVal });
    }
    case 'sequence': {
        const start = Number(params.start) || 1;
        const step = Number(params.step) || 1;

        return (_rowIndex, lastSequenceValue) => {
            let currentVal: number;
            if (lastSequenceValue !== undefined) {
                currentVal = lastSequenceValue + step;
            } else {
                 currentVal = start;
            }
            return { value: String(currentVal), nextSeq: currentVal };
        };
    }
    case 'uuid': {
        return () => ({ value: generateUUID() });
    }
    case 'list': {
        const listStr = String(params.values || '');
        const items = listStr.split(',').map(s => s.trim()).filter(s => s.length > 0);
        if (items.length === 0) {
            return () => ({ value: '' });
        }
        return () => {
            const item = items[Math.floor(Math.random() * items.length)];
            return { value: item };
        };
    }
    case 'timestamp': {
        const val = context.timestamp.toISOString();
        return () => ({ value: val });
    }
    default:
      return () => ({ value: '' });
  }
};
