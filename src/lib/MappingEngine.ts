/**
 * MappingEngine - データ変換パイプラインのオーケストレーター
 * 
 * このモジュールは、変換タスクの実行を調整し、
 * 各変換ノードへのデータフローを管理します。
 * 実際の変換ロジックはtransformations/配下のStrategyクラスに委譲されます。
 */

import type {
    Mapping,
    MappingTask,
    Transformation,
    SourceConfig
} from './MappingTypes';
import type { DataRow, ConnectionDefinition, TableDefinition, TopicDefinition } from './types';
import { decompressRecursive, isCompressed } from './ArchiveEngine';
import {
    getStrategy,
    type TransformationContext,
    type ExecutionStats,
    type ExecutionState,
    type FileSystemOps,
    type DbOps,
    type DbRecord,
} from './transformations';

// Re-export types for backward compatibility
export type { ExecutionStats, ExecutionState, FileSystemOps, DbOps, DbRecord };

export type ExecutionObserver = (stats: ExecutionStats) => void;

// Helper to extract data from DB record or raw object
const extractData = (record: unknown): DataRow => {
    if (record && typeof record === 'object' && 'data' in record) {
        return (record as DbRecord).data;
    }
    return record as DataRow;
};

// Helper to check stop on errors
const checkStopOnErrors = (stats: ExecutionStats, task: MappingTask) => {
    if (task.stopOnErrors && task.stopOnErrors > 0) {
        const totalErrors = Object.values(stats.transformations).reduce((acc, t) => acc + t.errors, 0);
        if (totalErrors > task.stopOnErrors) {
            throw new Error(`Execution halted: Total errors (${totalErrors}) exceeded limit (${task.stopOnErrors}).`);
        }
    }
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 変換グラフを非同期で走査し、各ノードの変換を実行します
 */
const traverseAsync = async (
    currentNode: Transformation,
    batchOrRouterResult: DataRow[] | Record<string, DataRow[]>,
    mapping: Mapping,
    connections: ConnectionDefinition[],
    tables: TableDefinition[],
    topics: TopicDefinition[],
    fs: FileSystemOps,
    db: DbOps,
    stats: ExecutionStats,
    state: ExecutionState,
    parameters: Record<string, string>,
    task: MappingTask,
    observer?: ExecutionObserver
) => {
    const outgoingLinks = mapping.links.filter(l => l.sourceId === currentNode.id);

    for (const link of outgoingLinks) {
        // Resolve input batch for this link
        let batch: DataRow[] = [];
        if (currentNode.type === 'router' && !Array.isArray(batchOrRouterResult)) {
            let defaultGroup = 'default';
            if ('defaultGroup' in currentNode.config) {
                defaultGroup = (currentNode.config as { defaultGroup?: string }).defaultGroup || 'default';
            }
            const groupName = link.routerGroup || defaultGroup;
            batch = (batchOrRouterResult as Record<string, DataRow[]>)[groupName] || [];
        } else {
            batch = batchOrRouterResult as DataRow[];
        }

        const nextNode = mapping.transformations.find(t => t.id === link.targetId);
        if (!nextNode) continue;

        // Simulate processing delay
        await delay(50);

        // Update Input Stats
        if (!stats.transformations[nextNode.id]) {
            stats.transformations[nextNode.id] = { name: nextNode.name, input: 0, output: 0, errors: 0, rejects: 0 };
        }
        stats.transformations[nextNode.id].input += batch.length;

        // Update Link Stats
        if (!stats.links) stats.links = {};
        if (!stats.links[link.id]) stats.links[link.id] = 0;
        stats.links[link.id] += batch.length;

        // Notify Observer (Input Phase)
        if (observer) observer({ ...stats });

        // Build context for strategy execution
        const context: TransformationContext = {
            batch,
            parameters,
            mapping,
            stats,
            task,
            connections,
            tables,
            topics,
            fs,
            db,
            state,
        };

        let processedBatch: DataRow[] | Record<string, DataRow[]> = [];

        try {
            // Get the strategy for this transformation type
            const strategy = getStrategy(nextNode.type);

            if (strategy) {
                const result = await strategy.execute(nextNode, context);

                if (result.routerOutput) {
                    // Router returns grouped output
                    processedBatch = result.routerOutput;
                } else if (result.continue) {
                    processedBatch = result.output;
                } else {
                    // Strategy indicated to halt further processing
                    processedBatch = [];
                }
            } else {
                // Fallback: pass through if no strategy found
                console.warn(`No strategy found for type: ${nextNode.type}, passing through`);
                processedBatch = batch;
            }
        } catch (e) {
            console.error(`Error in node ${nextNode.name}`, e);
            stats.transformations[nextNode.id].errors += 1;
            if (!stats.rejectRows) stats.rejectRows = [];
            stats.rejectRows.push({
                row: batch.length > 0 ? batch[0] : {},
                error: `[Batch Size: ${batch.length}] ${e instanceof Error ? e.message : String(e)}`,
                transformationName: nextNode.name
            });

            checkStopOnErrors(stats, task);
        }

        let outputCount = 0;
        if (Array.isArray(processedBatch)) {
            outputCount = processedBatch.length;
        } else {
            outputCount = Object.values(processedBatch).reduce((acc, arr) => acc + arr.length, 0);
        }
        stats.transformations[nextNode.id].output += outputCount;

        // Notify Observer (Output Phase)
        if (observer) observer({ ...stats });

        if (outputCount > 0) {
            await traverseAsync(nextNode, processedBatch, mapping, connections, tables, topics, fs, db, stats, state, parameters, task, observer);
        }
    }
};

/**
 * マッピングタスクを実行します
 */
export const executeMappingTaskRecursive = async (
    task: MappingTask,
    mapping: Mapping,
    connections: ConnectionDefinition[],
    tables: TableDefinition[],
    topics: TopicDefinition[],
    fs: FileSystemOps,
    db: DbOps,
    state: ExecutionState,
    observer?: ExecutionObserver
): Promise<{ stats: ExecutionStats; newState: ExecutionState }> => {

    const stats: ExecutionStats = { transformations: {}, rejectRows: [], cache: {} };
    const newState = { ...state, sequences: { ...(state.sequences || {}) } };

    // Resolve Parameter File
    const fileParameters: Record<string, string> = {};
    if (task.parameterFileName) {
        try {
            const parts = task.parameterFileName.split(':');
            let host = 'localhost';
            let path = task.parameterFileName;
            if (parts.length > 1) {
                host = parts[0];
                path = parts.slice(1).join(':');
            }
            const pathParts = path.split('/');
            const filename = pathParts.pop();
            const dir = pathParts.join('/');

            if (filename) {
                const content = fs.readFile(host, dir || '/', filename);
                if (content) {
                    content.split(/\r?\n/).forEach(line => {
                        const idx = line.indexOf('=');
                        if (idx > 0) {
                            const key = line.substring(0, idx).trim();
                            const val = line.substring(idx + 1).trim();
                            if (key && !key.startsWith('#')) {
                                fileParameters[key] = val;
                            }
                        }
                    });
                }
            }
        } catch (e) {
            if (!stats.rejectRows) stats.rejectRows = [];
            stats.rejectRows.push({
                row: { file: task.parameterFileName },
                error: `Failed to load parameter file: ${e instanceof Error ? e.message : String(e)}`,
                transformationName: 'ParameterInit'
            });
        }
    }

    // Resolve Parameters
    const startTime = new Date();
    const parameters = {
        'SYSDATE': startTime.toISOString(),
        'SESSSTARTTIME': startTime.toISOString(),
        ...(mapping.parameters || {}),
        ...fileParameters,
        ...(task.parameters || {})
    };

    mapping.transformations.forEach(t => {
        stats.transformations[t.id] = { name: t.name, input: 0, output: 0, errors: 0, rejects: 0 };
    });

    stats.rejectRows = [];

    const sources = mapping.transformations.filter(t => t.type === 'source');

    for (const sourceNode of sources) {
        const config = sourceNode.config as SourceConfig;
        const conn = connections.find(c => c.id === config.connectionId);
        if (!conn) continue;

        let records: DataRow[] = [];

        // Simulate reading delay
        await delay(100);

        if (conn.type === 'file') {
            const path = config.path || '/';
            const files = fs.listFiles(conn.host, path);
            const processedSet = newState.processedFiles as Set<string> | undefined || new Set<string>();
            const file = files.find(f => !processedSet.has(`${task.id}:${f.name}`));

            if (file) {
                const rawContent = fs.readFile(conn.host, path, file.name);
                let filesToProcess = [{ name: file.name, content: rawContent }];

                // Check for unhandled compression
                if (!config.decompression && isCompressed(rawContent)) {
                    stats.transformations[sourceNode.id].errors++;
                    if (!stats.rejectRows) stats.rejectRows = [];
                    stats.rejectRows.push({
                        row: { file: file.name },
                        error: `Compressed file detected but decompression is disabled.`,
                        transformationName: sourceNode.name
                    });
                }

                if (config.decompression) {
                    const decompressed = decompressRecursive(rawContent, file.name);
                    if (decompressed.files.length > 0) {
                        filesToProcess = decompressed.files.map(f => ({ name: f.filename, content: f.content }));
                    }
                }

                for (const processingFile of filesToProcess) {
                    let fileRecords: DataRow[] = [];
                    if (processingFile.name.endsWith('.csv')) {
                        try {
                            const lines = processingFile.content.split(/\r?\n/);
                            if (lines.length > 0) {
                                const headers = lines[0].split(',');
                                fileRecords = lines.slice(1).filter(l => l.trim()).map(line => {
                                    const vals = line.split(',');
                                    const rec: DataRow = {};
                                    headers.forEach((h, i) => rec[h.trim()] = vals[i]?.trim());
                                    return rec;
                                });
                            }
                        } catch (e) {
                            console.error(`[MappingEngine] Failed to parse CSV file: ${processingFile.name}`, e);
                            stats.transformations[sourceNode.id].errors++;
                            if (!stats.rejectRows) stats.rejectRows = [];
                            stats.rejectRows.push({
                                row: { file: processingFile.name },
                                error: `Failed to parse CSV: ${e instanceof Error ? e.message : String(e)}`,
                                transformationName: sourceNode.name
                            });
                        }
                    } else {
                        try {
                            const parsed = JSON.parse(processingFile.content);
                            fileRecords = Array.isArray(parsed) ? parsed : [parsed];
                        } catch (e) {
                            if (!config.decompression && isCompressed(processingFile.content)) {
                                // Already handled above
                            } else {
                                stats.transformations[sourceNode.id].errors++;
                                if (!stats.rejectRows) stats.rejectRows = [];
                                stats.rejectRows.push({
                                    row: { file: processingFile.name },
                                    error: `Failed to parse JSON: ${e instanceof Error ? e.message : String(e)}`,
                                    transformationName: sourceNode.name
                                });
                            }
                            fileRecords = [{ file: processingFile.name, content: processingFile.content }];
                        }
                    }

                    if (config.filenameColumn && config.filenameColumn.trim()) {
                        fileRecords = fileRecords.map(rec => ({
                            ...rec,
                            [config.filenameColumn!]: processingFile.name
                        }));
                    }

                    records.push(...fileRecords);
                }

                if (!newState.processedFiles) newState.processedFiles = new Set(processedSet);
                (newState.processedFiles as Set<string>).add(`${task.id}:${file.name}`);

                if (config.deleteAfterRead) {
                    fs.deleteFile(conn.host, file.name, path);
                }
            }
        } else if (conn.type === 'database') {
            const tableName = config.tableName || 'default_table';
            const raw = db.select(tableName);
            const lastTs = newState.lastProcessedTimestamp as number | undefined || 0;

            records = raw.filter((r: unknown) => {
                const record = r as { insertedAt?: number };
                return (record.insertedAt || 0) > lastTs;
            }).map(r => ({
                ...extractData(r),
                insertedAt: (r as { insertedAt?: number }).insertedAt
            }));

            if (records.length > 0) {
                const maxTs = Math.max(...records.map(r => Number(r['insertedAt']) || 0));
                newState.lastProcessedTimestamp = maxTs;
            }
        }

        stats.transformations[sourceNode.id].input = records.length;
        stats.transformations[sourceNode.id].output = records.length;

        // Notify initial stats
        if (observer) observer({ ...stats });

        if (records.length > 0) {
            await traverseAsync(sourceNode, records, mapping, connections, tables, topics, fs, db, stats, newState, parameters, task, observer);
        }
    }

    if (task.badFileDir && stats.rejectRows && stats.rejectRows.length > 0) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `Bad_Rows_${task.name.replace(/\s+/g, '_')}_${timestamp}.csv`;
        const header = 'Transformation,Error,RowData\n';
        const content = stats.rejectRows.map(r => {
            const rowStr = JSON.stringify(r.row).replace(/"/g, '""');
            return `"${r.transformationName}","${r.error}","${rowStr}"`;
        }).join('\n');

        const targetDir = task.badFileDir.endsWith('/') ? task.badFileDir : task.badFileDir + '/';
        try {
            fs.writeFile('localhost', targetDir, filename, header + content);
        } catch (e) {
            console.error(`[MappingEngine] Failed to write bad file`, e);
        }
    }

    return { stats, newState };
};

export const executeMappingTask = executeMappingTaskRecursive;
