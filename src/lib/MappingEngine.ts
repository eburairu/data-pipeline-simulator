import {
    type Mapping,
    type MappingTask,
    type Transformation,
    type SourceConfig,
    type TargetConfig,
    type FilterConfig,
    type ExpressionConfig,
    type AggregatorConfig
} from './MappingTypes';
import { type ConnectionDefinition, type TableDefinition } from './SettingsContext';

// Interfaces for dependencies to decouple from Hooks
export interface FileSystemOps {
    listFiles: (host: string, path: string) => any[];
    readFile: (host: string, path: string, filename: string) => string;
    deleteFile: (host: string, filename: string, path: string) => void;
    writeFile: (host: string, path: string, filename: string, content: string) => void;
}

export interface DbOps {
    select: (tableName: string) => any[];
    insert: (tableName: string, record: any) => void;
    delete?: (tableName: string, id: string) => void;
}

export interface ExecutionStats {
    [transformationId: string]: { input: number; output: number; errors: number };
}

export interface ExecutionState {
    processedFiles?: Set<string>;
    lastProcessedTimestamp?: number;
    [key: string]: any;
}

// Helper to evaluate conditions/expressions safely-ish
const evaluateExpression = (record: any, expression: string): any => {
    try {
        // Allow accessing record fields like "amount" or "record.amount"
        // This is a naive implementation for simulation purposes
        const keys = Object.keys(record);
        const values = Object.values(record);
        // Create a function with keys as arguments
        const func = new Function(...keys, `return ${expression};`);
        return func(...values);
    } catch (e) {
        // console.warn(`Expression evaluation failed: ${expression}`, e);
        return null;
    }
};

// Re-implementing traverse properly
const traverse = (
    currentNode: Transformation,
    batch: any[],
    mapping: Mapping,
    connections: ConnectionDefinition[],
    tables: TableDefinition[],
    fs: FileSystemOps,
    db: DbOps,
    stats: ExecutionStats
) => {
    // Find next nodes
    const outgoingLinks = mapping.links.filter(l => l.sourceId === currentNode.id);
    const nextNodes = outgoingLinks.map(l => mapping.transformations.find(t => t.id === l.targetId)).filter(Boolean) as Transformation[];

    for (const nextNode of nextNodes) {
        let processedBatch: any[] = [];
        stats[nextNode.id].input += batch.length;

        try {
             switch (nextNode.type) {
                case 'filter': {
                    const conf = nextNode.config as FilterConfig;
                    processedBatch = batch.filter(row => evaluateExpression(row, conf.condition));
                    break;
                }
                case 'expression': {
                    const conf = nextNode.config as ExpressionConfig;
                    processedBatch = batch.map(row => {
                        const newRow = { ...row };
                        conf.fields.forEach(f => {
                            newRow[f.name] = evaluateExpression(row, f.expression);
                        });
                        return newRow;
                    });
                    break;
                }
                case 'aggregator': {
                    const conf = nextNode.config as AggregatorConfig;
                     const groups: Record<string, any[]> = {};
                    batch.forEach(row => {
                        const key = conf.groupBy.map(g => row[g]).join('::');
                        if (!groups[key]) groups[key] = [];
                        groups[key].push(row);
                    });

                    processedBatch = Object.entries(groups).map(([key, rows]) => {
                        const res: any = {};
                        conf.groupBy.forEach((g, i) => res[g] = key.split('::')[i]);
                        conf.aggregates.forEach(agg => {
                            const values = rows.map(r => Number(r[agg.field]) || 0);
                            if (agg.function === 'sum') res[agg.name] = values.reduce((a, b) => a + b, 0);
                            if (agg.function === 'count') res[agg.name] = values.length;
                            if (agg.function === 'avg') res[agg.name] = values.reduce((a, b) => a + b, 0) / values.length;
                            if (agg.function === 'max') res[agg.name] = Math.max(...values);
                            if (agg.function === 'min') res[agg.name] = Math.min(...values);
                        });
                        return res;
                    });
                    break;
                }
                case 'target': {
                    const conf = nextNode.config as TargetConfig;
                    const targetConn = connections.find(c => c.id === conf.connectionId);
                    processedBatch = batch; // Copy batch to processedBatch for target processing
                    if (targetConn) {
                        if (targetConn.type === 'database') {
                            const tableName = targetConn.tableName || 'output';
                            const tableDef = tables.find(t => t.name === tableName);

                            processedBatch.forEach(row => {
                                let recordToInsert = row;
                                if (tableDef) {
                                    // Auto Field Mapping: only insert fields that match column definitions
                                    const filteredRow: any = {};
                                    tableDef.columns.forEach(col => {
                                        if (Object.prototype.hasOwnProperty.call(row, col.name)) {
                                            filteredRow[col.name] = row[col.name];
                                        }
                                    });
                                    recordToInsert = filteredRow;
                                }
                                db.insert(tableName, recordToInsert);
                            });
                        } else if (targetConn.type === 'file') {
                            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                            const filename = `output_${timestamp}.json`;
                            const content = JSON.stringify(batch, null, 2);
                            fs.writeFile(targetConn.host!, targetConn.path!, filename, content);
                        }
                    }
                    processedBatch = batch;
                    break;
                }
                default:
                    processedBatch = batch;
            }
        } catch (e) {
            console.error(`Error in node ${nextNode.name}`, e);
            stats[nextNode.id].errors += 1;
        }

        stats[nextNode.id].output += processedBatch.length;
        if (processedBatch.length > 0) {
            traverse(nextNode, processedBatch, mapping, connections, tables, fs, db, stats);
        }
    }
};

// Refactor executeMappingTask to use recursive traverse
export const executeMappingTaskRecursive = async (
    task: MappingTask,
    mapping: Mapping,
    connections: ConnectionDefinition[],
    tables: TableDefinition[],
    fs: FileSystemOps,
    db: DbOps,
    state: ExecutionState
): Promise<{ stats: ExecutionStats; newState: ExecutionState }> => {

    const stats: ExecutionStats = {};
    const newState = { ...state };

    mapping.transformations.forEach(t => {
        stats[t.id] = { input: 0, output: 0, errors: 0 };
    });

    const sources = mapping.transformations.filter(t => t.type === 'source');

    for (const sourceNode of sources) {
        const config = sourceNode.config as SourceConfig;
        const conn = connections.find(c => c.id === config.connectionId);
        if (!conn) continue;

        let records: any[] = [];

        if (conn.type === 'file') {
             const files = fs.listFiles(conn.host!, conn.path!);
             const processedSet = state.processedFiles || new Set<string>();
             // Only process ONE file per interval to simulate flow visibly
             const file = files.find(f => !processedSet.has(`${task.id}:${f.name}`));

             if (file) {
                let content = fs.readFile(conn.host!, conn.path!, file.name);
                if (file.name.endsWith('.csv')) {
                   try {
                       const lines = content.split(/\r?\n/);
                       const headers = lines[0].split(',');
                       records = lines.slice(1).filter(l => l.trim()).map(line => {
                           const vals = line.split(',');
                           const rec: any = {};
                           headers.forEach((h, i) => rec[h.trim()] = vals[i]?.trim());
                           return rec;
                       });
                       if (records.length === 0) {
                           console.warn(`[MappingEngine] No records parsed from CSV file: ${file.name}`);
                       }
                   } catch (e) {
                       console.error(`[MappingEngine] Failed to parse CSV file: ${file.name}`, e);
                   }
                } else {
                   try {
                        // Try JSON
                        records = JSON.parse(content);
                        if (!Array.isArray(records)) records = [records];
                   } catch {
                       records = [{ file: file.name, content: content }];
                   }
                }

                if (!newState.processedFiles) newState.processedFiles = new Set(processedSet);
                (newState.processedFiles as Set<string>).add(`${task.id}:${file.name}`);

                if (config.deleteAfterRead) {
                    fs.deleteFile(conn.host!, file.name, conn.path!);
                }
             }
        } else if (conn.type === 'database') {
             const raw = db.select(conn.tableName || '');
             const lastTs = state.lastProcessedTimestamp || 0;
             records = raw.filter(r => r.insertedAt > lastTs).map(r => ({...r.data, insertedAt: r.insertedAt}));

             if (records.length > 0) {
                 const maxTs = Math.max(...records.map(r => r.insertedAt));
                 newState.lastProcessedTimestamp = maxTs;
             }
        }

        stats[sourceNode.id].input = records.length;
        stats[sourceNode.id].output = records.length;

        if (records.length > 0) {
            traverse(sourceNode, records, mapping, connections, tables, fs, db, stats);
        }
    }
    return { stats, newState };
}

export const executeMappingTask = executeMappingTaskRecursive;
