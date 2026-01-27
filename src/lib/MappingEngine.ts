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
import { type ConnectionDefinition } from './SettingsContext';
import { processTemplate } from './templateUtils';

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

export const executeMappingTask = async (
    task: MappingTask,
    mapping: Mapping,
    connections: ConnectionDefinition[],
    fs: FileSystemOps,
    db: DbOps,
    state: ExecutionState
): Promise<{ stats: ExecutionStats; newState: ExecutionState }> => {

    const stats: ExecutionStats = {};
    const newState = { ...state };

    // Initialize stats
    mapping.transformations.forEach(t => {
        stats[t.id] = { input: 0, output: 0, errors: 0 };
    });

    // 1. Identify Source Nodes
    const sources = mapping.transformations.filter(t => t.type === 'source');

    // We assume a simple flow for now (single source or multiple independent sources)
    // Complex joins are out of scope for this iteration

    for (const sourceNode of sources) {
        const config = sourceNode.config as SourceConfig;
        const conn = connections.find(c => c.id === config.connectionId);
        if (!conn) {
            console.error(`Connection ${config.connectionId} not found`);
            continue;
        }

        let records: any[] = [];

        // --- READ PHASE ---
        if (conn.type === 'file') {
            const files = fs.listFiles(conn.host!, conn.path!);
            // Simple logic: process first file not in processed set
            // Note: In a real engine, we might track processed files in persistence.
            // Here we rely on state.processedFiles passed in.
            const processedSet = state.processedFiles || new Set<string>();

            // Find a candidate file
            const file = files.find(f => !processedSet.has(`${task.id}:${f.name}`));

            if (file) {
                // Read content
                // Assume CSV for simplicity or just raw content wrapped in object
                const content = fs.readFile(conn.host!, conn.path!, file.name);
                // Basic CSV parser (very naive)
                if (file.name.endsWith('.csv')) {
                   const lines = content.split('\n');
                   const headers = lines[0].split(',');
                   records = lines.slice(1).filter(l => l.trim()).map(line => {
                       const vals = line.split(',');
                       const rec: any = {};
                       headers.forEach((h, i) => rec[h.trim()] = vals[i]?.trim());
                       return rec;
                   });
                } else {
                   // Treat as single record with content field
                   records = [{ file: file.name, content: content }];
                }

                // Track this file as processed in the new state
                if (!newState.processedFiles) newState.processedFiles = new Set(processedSet);
                (newState.processedFiles as Set<string>).add(`${task.id}:${file.name}`);

                // Also, we might want to delete the source file if it's an ETL movement
                // But typically Source stays, unless configured to delete.
                // For now, we simulate "Read" so we don't delete by default unless it's a "Move" job,
                // but IDMC Mapping usually reads.
            }
        } else if (conn.type === 'database') {
            const raw = db.select(conn.tableName || '');
            // Incremental logic: if state has timestamp, filter
            const lastTs = state.lastProcessedTimestamp || 0;
            records = raw.filter(r => r.insertedAt > lastTs).map(r => ({...r.data, insertedAt: r.insertedAt}));

            if (records.length > 0) {
                const maxTs = Math.max(...records.map(r => r.insertedAt));
                newState.lastProcessedTimestamp = maxTs;
            }
        }

        stats[sourceNode.id].input = records.length;
        stats[sourceNode.id].output = records.length; // Source outputs what it reads

        // --- PIPELINE TRAVERSAL ---
        // BFS or simple propagation
        let currentBatch = records;
        let currentNodes = [sourceNode];

        // This is a simplified traversal that assumes a linear or tree structure from the source.
        // It doesn't handle merges (Joiner/Union) correctly yet.

        while (currentNodes.length > 0) {
            const node = currentNodes.shift()!;

            // Find outgoing links
            const outgoingLinks = mapping.links.filter(l => l.sourceId === node.id);
            const nextNodes = outgoingLinks.map(l => mapping.transformations.find(t => t.id === l.targetId)).filter(Boolean) as Transformation[];

            // Process for each next node
            for (const nextNode of nextNodes) {
                let processedBatch: any[] = [];

                // Stats
                stats[nextNode.id].input += currentBatch.length;

                try {
                    switch (nextNode.type) {
                        case 'filter': {
                            const conf = nextNode.config as FilterConfig;
                            processedBatch = currentBatch.filter(row => {
                                const result = evaluateExpression(row, conf.condition);
                                return !!result;
                            });
                            break;
                        }
                        case 'expression': {
                            const conf = nextNode.config as ExpressionConfig;
                            processedBatch = currentBatch.map(row => {
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
                            // Naive group by
                            const groups: Record<string, any[]> = {};
                            currentBatch.forEach(row => {
                                const key = conf.groupBy.map(g => row[g]).join('::');
                                if (!groups[key]) groups[key] = [];
                                groups[key].push(row);
                            });

                            processedBatch = Object.entries(groups).map(([key, rows]) => {
                                const res: any = {};
                                // Set group keys
                                conf.groupBy.forEach((g, i) => res[g] = key.split('::')[i]);
                                // Calculate aggregates
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
                            if (targetConn) {
                                if (targetConn.type === 'database') {
                                    // Insert
                                    currentBatch.forEach(row => {
                                        db.insert(targetConn.tableName || 'output', row);
                                    });
                                } else if (targetConn.type === 'file') {
                                    // Write file
                                    // Generate a filename
                                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                                    const filename = `output_${timestamp}.json`;
                                    const content = JSON.stringify(currentBatch, null, 2);
                                    fs.writeFile(targetConn.host!, targetConn.path!, filename, content);
                                }
                            }
                            processedBatch = currentBatch; // Pass through just in case
                            break;
                        }
                        default:
                            processedBatch = currentBatch;
                    }
                } catch (e) {
                    console.error(`Error processing node ${nextNode.name}`, e);
                    stats[nextNode.id].errors += 1;
                }

                stats[nextNode.id].output += processedBatch.length;

                // Continue traversal
                if (processedBatch.length > 0) {
                     // In a real DAG we need to be careful not to re-process nodes or handle merges
                     // For tree structures, this recursion (queue push) works.
                     // We push the *result* as input to the next node.
                     // Note: We need to associate the processed batch with the specific next node for the next iteration.
                     // The current BFS implementation is slightly flawed because it shares `currentNodes` queue but `currentBatch` variable is local to loop?
                     // No, wait.

                     // Recursive call or Queue with State is better.
                     // Let's use recursion for simplicity.
                     await traverse(nextNode, processedBatch);
                }
            }
        }

        async function traverse(node: Transformation, batch: any[]) {
             const outgoingLinks = mapping.links.filter(l => l.sourceId === node.id);
             const nextNodes = outgoingLinks.map(l => mapping.transformations.find(t => t.id === l.targetId)).filter(Boolean) as Transformation[];

             for (const nextNode of nextNodes) {
                 // Logic repeated from above... refactor needed?
                 // Let's just make the main loop call this traverse function for Source too.
             }
        }
    }

    return { stats, newState };
};

// Re-implementing traverse properly
const traverse = (
    currentNode: Transformation,
    batch: any[],
    mapping: Mapping,
    connections: ConnectionDefinition[],
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
                    if (targetConn) {
                        if (targetConn.type === 'database') {
                            batch.forEach(row => {
                                db.insert(targetConn.tableName || 'output', row);
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
            traverse(nextNode, processedBatch, mapping, connections, fs, db, stats);
        }
    }
};

// Refactor executeMappingTask to use recursive traverse
export const executeMappingTaskRecursive = async (
    task: MappingTask,
    mapping: Mapping,
    connections: ConnectionDefinition[],
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
                   const lines = content.split('\n');
                   const headers = lines[0].split(',');
                   records = lines.slice(1).filter(l => l.trim()).map(line => {
                       const vals = line.split(',');
                       const rec: any = {};
                       headers.forEach((h, i) => rec[h.trim()] = vals[i]?.trim());
                       return rec;
                   });
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
            traverse(sourceNode, records, mapping, connections, fs, db, stats);
        }
    }
    return { stats, newState };
}
