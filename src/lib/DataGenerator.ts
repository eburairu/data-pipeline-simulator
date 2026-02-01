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

  // Optimization: Pre-calculate static values to avoid redundant template processing in the loop
  const generators = schema.map(col => {
    if (col.type === 'static') {
      const val = col.params.value !== undefined ? String(col.params.value) : '';
      const processed = processTemplate(val, context);
      return () => ({ value: processed });
    }
    return (rowIndex: number, lastSeq?: number) => generateValue(col, rowIndex, context, lastSeq);
  });

  for (let i = 0; i < rowCount; i++) {
    const rowValues = schema.map((col, idx) => {
        const { value, nextSeq } = generators[idx](i, currentSequenceState[col.id]);
        if (nextSeq !== undefined) {
            currentSequenceState[col.id] = nextSeq;
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

// Return value and optional next sequence state
const generateValue = (
    col: ColumnSchema,
    _rowIndex: number,
    context: TemplateContext,
    lastSequenceValue?: number
): { value: string, nextSeq?: number } => {
  const { type, params } = col;

  switch (type) {
    case 'static': {
      const val = params.value !== undefined ? String(params.value) : '';
      return { value: processTemplate(val, context) };
    }
    case 'randomInt': {
      const min = Number(params.min) || 0;
      const max = Number(params.max) || 100;
      return { value: String(Math.floor(Math.random() * (max - min + 1)) + min) };
    }
    case 'randomFloat': {
      const min = Number(params.min) || 0;
      const max = Number(params.max) || 1;
      const precision = params.precision !== undefined ? Number(params.precision) : 2;
      const val = Math.random() * (max - min) + min;
      return { value: val.toFixed(precision) };
    }
    case 'sin': {
      const period = Number(params.period) || 10000; // default 10s
      const amplitude = Number(params.amplitude) || 1;
      const offset = Number(params.offset) || 0;
      // Use timestamp for continuity
      const t = context.timestamp.getTime();
      const val = amplitude * Math.sin(2 * Math.PI * (t / period)) + offset;
      return { value: val.toFixed(4) };
    }
    case 'cos': {
      const period = Number(params.period) || 10000;
      const amplitude = Number(params.amplitude) || 1;
      const offset = Number(params.offset) || 0;
      const t = context.timestamp.getTime();
      const val = amplitude * Math.cos(2 * Math.PI * (t / period)) + offset;
      return { value: val.toFixed(4) };
    }
    case 'sequence': {
        const start = Number(params.start) || 1;
        const step = Number(params.step) || 1;

        // If we have a last value, continue from there + step.
        // If not (first run), start at 'start'.
        // Note: For the *very first* row of the first run, we usually want 'start'.
        // However, if we simply do 'lastValue + step', we need to initialize lastValue carefully.
        // Let's say lastValue is undefined. Current = start. Next = start.
        // Wait, if rowIndex > 0 in this batch, we should have updated lastValue locally in the loop.

        let currentVal: number;
        if (lastSequenceValue !== undefined) {
            currentVal = lastSequenceValue + step;
        } else {
             // First time ever.
             // If params.start is 1, we want 1.
             // But if this is rowIndex > 0, we shouldn't be here if we are updating state correctly.
             // logic: lastSequenceValue represents the value generated in the PREVIOUS step (or previous row).
             currentVal = start;
        }

        return { value: String(currentVal), nextSeq: currentVal };
    }
    case 'uuid': {
        return { value: generateUUID() };
    }
    case 'list': {
        const listStr = String(params.values || '');
        const items = listStr.split(',').map(s => s.trim()).filter(s => s.length > 0);
        if (items.length === 0) return { value: '' };
        const item = items[Math.floor(Math.random() * items.length)];
        return { value: item };
    }
    case 'timestamp': {
        // Requested by user
        return { value: context.timestamp.toISOString() };
    }
    default:
      return { value: '' };
  }
};
