import {
    type Mapping,
    type MappingTask,
    type Transformation,
    type TargetTransformation,
    type FilterTransformation,
    type ExpressionTransformation,
    type AggregatorTransformation,
    type ValidatorTransformation,
    type JoinerTransformation,
    type LookupTransformation,
    type RouterTransformation,
    type SorterTransformation,
    type UnionTransformation,
    type NormalizerTransformation,
    type RankTransformation,
    type SequenceTransformation,
    type UpdateStrategyTransformation,
    type CleansingTransformation,
    type DeduplicatorTransformation,
    type PivotTransformation,
    type UnpivotTransformation,
    type SqlTransformation,
    type WebServiceTransformation,
    type HierarchyParserTransformation,
    type SourceConfig // Used in executeMappingTaskRecursive
} from './MappingTypes';
import { type DataRow, type DataValue, type ConnectionDefinition, type TableDefinition, type TopicDefinition } from './types';
import { ExpressionFunctions } from './ExpressionFunctions';

export interface DbRecord {
    id: string;
    data: DataRow;
}

// Helper to extract data from DB record or raw object
const extractData = (record: unknown): DataRow => {
    if (record && typeof record === 'object' && 'data' in record) {
        return (record as DbRecord).data;
    }
    return record as DataRow;
};

// Interfaces for dependencies to decouple from Hooks
export interface FileSystemOps {
    listFiles: (host: string, path: string) => { name: string, content: string }[];
    readFile: (host: string, path: string, filename: string) => string;
    deleteFile: (host: string, filename: string, path: string) => void;
    writeFile: (host: string, path: string, filename: string, content: string) => void;
}

export interface DbOps {
    select: (tableName: string) => (DbRecord | DataRow)[];
    insert: (tableName: string, record: DataRow) => void;
    update: (tableName: string, id: string, record: DataRow) => void;
    delete: (tableName: string, id: string) => void;
}

export interface ExecutionStats {
    transformations: { [transformationId: string]: { name: string; input: number; output: number; errors: number; rejects: number } };
    links?: { [linkId: string]: number };
    rejectRows?: { row: DataRow; error: string; transformationName: string }[];
    cache?: { [key: string]: unknown };
}

export interface ExecutionState {
    processedFiles?: Set<string>;
    lastProcessedTimestamp?: number;
    sequences?: Record<string, number>; // Persist sequence values by Node ID
    [key: string]: unknown;
}

export type ExecutionObserver = (stats: ExecutionStats) => void;

// 式の評価関数をキャッシュするためのマップ
const expressionCache = new Map<string, Function>();

// Helper to evaluate conditions/expressions safely-ish
export const evaluateExpression = (record: DataRow, expression: string, parameters: Record<string, string> = {}): DataValue => {
    try {
        const recordKeys = Object.keys(record);
        const recordValues = Object.values(record);

        const paramKeys = Object.keys(parameters);
        const paramValues = Object.values(parameters);

        const funcKeys = Object.keys(ExpressionFunctions);
        const funcValues = Object.values(ExpressionFunctions);

        // キャッシュキーの作成: 式と引数名のリストを組み合わせる
        const cacheKey = `${expression}|${recordKeys.join(',')}|${paramKeys.join(',')}`;

        let func = expressionCache.get(cacheKey);
        if (!func) {
            // Create a function with keys as arguments
            // Order: Record Fields, Parameters, Functions
            func = new Function(...recordKeys, ...paramKeys, ...funcKeys, `return ${expression};`);
            expressionCache.set(cacheKey, func);
        }

        return func(...recordValues, ...paramValues, ...funcValues) as DataValue;
    } catch {
        // console.warn(`Expression evaluation failed: ${expression}`, e);
        return null;
    }
};

// Helper to substitute parameters in string config values
const substituteParams = (str: string, params: Record<string, string>): string => {
    if (!str || typeof str !== 'string') return str;
    return str.replace(/\$\{(\w+)\}/g, (_, key) => params[key] || '');
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

// Helper to get nested value
const getValueByPath = (obj: unknown, path: string): DataValue => {
    if (!path) return undefined;
    // Simple split by dot, handling array index like "items[0]"
    const parts = path.split('.');
    let current: any = obj; // Keep any here for nested traversal of unknown structure
    for (const part of parts) {
        if (current === null || current === undefined) return undefined;
        const arrayMatch = part.match(/(\w+)\[(\d+)\]/);
        if (arrayMatch) {
            const arr = current[arrayMatch[1]];
            if (arr && Array.isArray(arr)) {
                current = arr[parseInt(arrayMatch[2])];
            } else {
                return undefined;
            }
        } else {
            current = current[part];
        }
    }
    return current as DataValue;
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const processFilter = (node: FilterTransformation, batch: DataRow[], parameters: Record<string, string>): DataRow[] => {
    return batch.filter(row => evaluateExpression(row, node.config.condition, parameters));
};

const processExpression = (node: ExpressionTransformation, batch: DataRow[], parameters: Record<string, string>): DataRow[] => {
    return batch.map(row => {
        const newRow = { ...row };
        node.config.fields.forEach(f => {
            newRow[f.name] = evaluateExpression(row, f.expression, parameters);
        });
        return newRow;
    });
};

const processAggregator = (node: AggregatorTransformation, batch: DataRow[]): DataRow[] => {
    const groups: Record<string, DataRow[]> = {};
    batch.forEach(row => {
        const key = node.config.groupBy.map(g => String(row[g])).join('::');
        if (!groups[key]) groups[key] = [];
        groups[key].push(row);
    });

    return Object.entries(groups).map(([key, rows]) => {
        const res: DataRow = {};
        node.config.groupBy.forEach((g, i) => res[g] = key.split('::')[i]);
        node.config.aggregates.forEach(agg => {
            const values = rows.map(r => Number(r[agg.field]) || 0);
            if (agg.function === 'sum') res[agg.name] = values.reduce((a, b) => a + b, 0);
            if (agg.function === 'count') res[agg.name] = values.length;
            if (agg.function === 'avg') res[agg.name] = values.reduce((a, b) => a + b, 0) / values.length;
            if (agg.function === 'max') res[agg.name] = Math.max(...values);
            if (agg.function === 'min') res[agg.name] = Math.min(...values);
        });
        return res;
    });
};

const processValidator = (
    node: ValidatorTransformation, 
    batch: DataRow[], 
    stats: ExecutionStats, 
    _task: MappingTask
): DataRow[] => {
    const rules = node.config.rules || [];
    const validRows: DataRow[] = [];

    // Optimization: Pre-compile regexes
    const compiledRules = rules.map(rule => {
        let regex: RegExp | undefined;
        if (rule.regex) {
            try {
                regex = new RegExp(rule.regex);
            } catch (e) {
                console.warn(`[MappingEngine] Invalid regex in validator: ${rule.regex}`, e);
            }
        }
        return { ...rule, compiledRegex: regex };
    });

    for (const row of batch) {
        let isValid = true;
        for (const rule of compiledRules) {
            const val = row[rule.field];

            // Required check
            if (rule.required && (val === undefined || val === null || val === '')) {
                isValid = false; break;
            }

            if (val !== undefined && val !== null && val !== '') {
                // Type check
                if (rule.type === 'number' && isNaN(Number(val))) {
                    isValid = false; break;
                }
                if (rule.type === 'boolean') {
                    const s = String(val).toLowerCase();
                    if (s !== 'true' && s !== 'false' && s !== '1' && s !== '0') {
                        isValid = false; break;
                    }
                }

                // Regex check (Optimized)
                if (rule.compiledRegex) {
                     if (!rule.compiledRegex.test(String(val))) {
                        isValid = false; break;
                     }
                }
            }
        }

        if (isValid) {
            validRows.push(row);
        } else {
            if (node.config.errorBehavior === 'error') {
                if (!stats.rejectRows) stats.rejectRows = [];
                stats.rejectRows.push({
                    row: row,
                    error: `Validation failed: Rule validation error`,
                    transformationName: node.name
                });
                stats.transformations[node.id].errors++;
                checkStopOnErrors(stats, _task);
            }
        }
    }
    return validRows;
};

const processTarget = async (
    node: TargetTransformation,
    batch: DataRow[],
    connections: ConnectionDefinition[],
    tables: TableDefinition[],
    topics: TopicDefinition[],
    fs: FileSystemOps,
    db: DbOps,
    stats: ExecutionStats,
    task: MappingTask
): Promise<DataRow[]> => {
    const processedBatch: DataRow[] = [];

    // Topic Target Processing
    if (node.config.targetType === 'topic' && node.config.topicId) {
        const topic = topics.find(t => t.id === node.config.topicId);
        if (!topic) {
            stats.transformations[node.id].errors += batch.length;
             if (!stats.rejectRows) stats.rejectRows = [];
             stats.rejectRows.push({
                row: batch.length > 0 ? batch[0] : {},
                error: `Topic not found: ${node.config.topicId}`,
                transformationName: node.name
             });
            return [];
        }

        const validBatch: DataRow[] = [];
        for (const row of batch) {
            let isValid = true;
            const cleanRow: DataRow = {};

            // Remove internal flags
            const rawRow = { ...row };
            delete rawRow['_strategy'];

            if (topic.schema && topic.schema.length > 0) {
                // Schema Enforcement
                for (const field of topic.schema) {
                    let val = rawRow[field.name];

                    // Check existence
                    if (val === undefined || val === null) {
                         if (topic.schemaEnforcement === 'strict') {
                             isValid = false; break;
                         } else {
                             val = null; // Lenient: Treat as null
                         }
                    }

                    // Check Type (Simplified)
                    if (val !== null) {
                        if (field.type === 'number') {
                            if (typeof val === 'number') {
                                // OK
                            } else {
                                if (topic.schemaEnforcement === 'strict') {
                                    isValid = false; break;
                                } else {
                                    const num = Number(val);
                                    if (isNaN(num)) {
                                        val = null;
                                    } else {
                                        val = num; // Auto-cast
                                    }
                                }
                            }
                        }
                        // Add other type checks as needed
                    }
                    cleanRow[field.name] = val;
                }

                // Check for unknown fields in Strict mode
                if (isValid && topic.schemaEnforcement === 'strict') {
                    for (const key of Object.keys(rawRow)) {
                        if (!topic.schema.some(f => f.name === key)) {
                            isValid = false; break;
                        }
                    }
                }
            } else {
                // No schema defined, pass through
                Object.assign(cleanRow, rawRow);
            }

            if (isValid) {
                validBatch.push(cleanRow);
            } else {
                stats.transformations[node.id].rejects++;
                if (!stats.rejectRows) stats.rejectRows = [];
                // Sample reject (don't fill memory with all rejects)
                if (stats.rejectRows.length < 100) {
                    stats.rejectRows.push({
                        row: row,
                        error: 'Schema Validation Failed',
                        transformationName: node.name
                    });
                }
            }
        }

        if (validBatch.length > 0) {
            // Write to Topic Directory: /topics/<topicId>/<timestamp>_<batchId>.json
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `data_${timestamp}_${Math.random().toString(36).substr(2, 5)}.json`;
            const content = JSON.stringify(validBatch, null, 2);
            // Assuming 'localhost' for internal storage
            fs.writeFile('localhost', `/topics/${topic.id}/`, filename, content);
            processedBatch.push(...validBatch);
        }

        return processedBatch;
    }

    // Connection Target Processing
    const targetConn = connections.find(c => c.id === node.config.connectionId);

    if (targetConn) {
        if (targetConn.type === 'database') {
            const tableName = node.config.tableName || 'output';
            const tableDef = tables.find(t => t.name === tableName);
            const updateCols = node.config.updateColumns || [];
            const dedupKeys = node.config.deduplicationKeys || [];

            // Pre-fetch records if any row needs matching/deduplication
            const needsLookup = batch.some(row => {
                const s = (row['_strategy'] as string) || 'insert';
                if (s === 'insert') return dedupKeys.length > 0;
                if (s === 'update' || s === 'delete') return updateCols.length > 0;
                return false;
            });

            let allRecords: (DbRecord | DataRow)[] = [];
            if (needsLookup) {
                allRecords = db.select(tableName);
            }

            // Build lookup maps for O(1) matching if keys are defined
            const getRecordKey = (data: DataRow, keys: string[]) => keys.map(k => String(data[k])).join('::');
            const dedupMap = new Map<string, DbRecord>();
            const updateMap = new Map<string, DbRecord>();

            if (needsLookup) {
                allRecords.forEach(r => {
                    const data = extractData(r);
                    const record = r as DbRecord;
                    if (dedupKeys.length > 0) {
                        const key = getRecordKey(data, dedupKeys);
                        if (!dedupMap.has(key)) dedupMap.set(key, record);
                    }
                    if (updateCols.length > 0) {
                        const key = getRecordKey(data, updateCols);
                        if (!updateMap.has(key)) updateMap.set(key, record);
                    }
                });
            }

            // Simulate Database IO latency per chunk (simplified as one await here)
            await delay(20);

            for (const row of batch) {
                const strategy = (row['_strategy'] as string) || 'insert'; // Default to insert
                const rowToProcess = { ...row };
                delete rowToProcess['_strategy']; // Remove internal flag

                if (strategy === 'reject') {
                    stats.transformations[node.id].rejects++;
                    continue;
                }

                // Apply field mapping (simple: match names)
                let recordToDb = rowToProcess;
                if (tableDef) {
                    const filtered: DataRow = {};
                    tableDef.columns.forEach(col => {
                        if (Object.prototype.hasOwnProperty.call(rowToProcess, col.name)) {
                            filtered[col.name] = rowToProcess[col.name];
                        }
                    });
                    recordToDb = filtered;
                }

                let shouldInsert = true;
                let shouldUpdate = false;
                let matchId: string | null = null;

                if (strategy === 'insert') {
                    const dupBehavior = node.config.duplicateBehavior || 'error';

                    if (dedupKeys.length > 0) {
                        const match = dedupMap.get(getRecordKey(row, dedupKeys));

                        if (match) {
                            shouldInsert = false;
                            matchId = match.id;
                            if (dupBehavior === 'error') {
                                stats.transformations[node.id].errors++;
                                checkStopOnErrors(stats, task);
                                continue;
                            } else if (dupBehavior === 'ignore') {
                                processedBatch.push(row); // Treat as success
                                continue;
                            } else if (dupBehavior === 'update') {
                                shouldUpdate = true;
                            }
                        }
                    }

                    if (shouldUpdate && matchId) {
                        db.update(tableName, matchId, recordToDb);
                        processedBatch.push(row);
                    } else if (shouldInsert) {
                        db.insert(tableName, recordToDb);
                        processedBatch.push(row);
                    }
                } else if (strategy === 'update' || strategy === 'delete') {
                    if (updateCols.length > 0) {
                        const match = updateMap.get(getRecordKey(row, updateCols));

                        if (match) {
                            if (strategy === 'update') {
                                db.update(tableName, match.id, recordToDb);
                                processedBatch.push(row);
                            } else if (strategy === 'delete') {
                                db.delete(tableName, match.id);
                                processedBatch.push(row);
                            }
                        }
                    }
                }
            }
        } else if (targetConn.type === 'file') {
            const path = node.config.path || '/';
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `output_${timestamp}.json`;
            const cleanBatch = batch.map(r => {
                const c = { ...r };
                delete c['_strategy'];
                return c;
            });
            const content = JSON.stringify(cleanBatch, null, 2);
            fs.writeFile(targetConn.host, path, filename, content);
            processedBatch.push(...cleanBatch);
        }
    } else {
        processedBatch.push(...batch);
    }
    return processedBatch;
};

const processJoiner = (
    node: JoinerTransformation,
    batch: DataRow[],
    mapping: Mapping,
    stats: ExecutionStats
): DataRow[] | null => {
    const joinerCacheKey = `joiner_${node.id}`;
    const incomingLinks = mapping.links.filter(l => l.targetId === node.id);

    if (incomingLinks.length < 2) {
        return batch;
    } else {
        if (!stats.cache) stats.cache = {};
        if (!stats.cache[joinerCacheKey]) {
            stats.cache[joinerCacheKey] = { masterBatch: batch, received: 1 };
            return null; // Halt until second branch arrives
        } else {
            const cached = stats.cache[joinerCacheKey] as { masterBatch: DataRow[], received: number };
            const masterBatch = cached.masterBatch;
            const detailBatch = batch;
            const joinedRows: DataRow[] = [];
            const matchedDetailIndices = new Set<number>();

            masterBatch.forEach(mRow => {
                let hasMatch = false;
                detailBatch.forEach((dRow, dIdx) => {
                    const match = node.config.masterKeys.every((mKey, i) => 
                        String(mRow[mKey]) === String(dRow[node.config.detailKeys[i]])
                    );
                    if (match) {
                        hasMatch = true;
                        matchedDetailIndices.add(dIdx);
                        joinedRows.push({ ...mRow, ...dRow });
                    }
                });
                
                if (!hasMatch && (node.config.joinType === 'left' || node.config.joinType === 'full')) {
                    joinedRows.push({ ...mRow });
                }
            });

            if (node.config.joinType === 'right' || node.config.joinType === 'full') {
                detailBatch.forEach((dRow, dIdx) => {
                    if (!matchedDetailIndices.has(dIdx)) {
                        joinedRows.push({ ...dRow });
                    }
                });
            }

            delete stats.cache[joinerCacheKey];
            return joinedRows;
        }
    }
};

const processLookup = (
    node: LookupTransformation,
    batch: DataRow[],
    connections: ConnectionDefinition[],
    db: DbOps
): DataRow[] => {
    const conn = connections.find(c => c.id === node.config.connectionId);
    if (!conn || conn.type !== 'database') return batch;

    const tableName = node.config.tableName || 'lookup_table';
    const allLookupRecords = db.select(tableName);
    return batch.map(row => {
        const match = allLookupRecords.find(r => {
            const d = extractData(r);
            return node.config.lookupKeys.every((lk, i) => String(row[lk]) === String(d[node.config.referenceKeys[i]]));
        });

        const newFields: DataRow = {};
        if (match) {
            const d = extractData(match);
            node.config.returnFields.forEach(rf => newFields[rf] = d[rf]);
        } else {
            node.config.returnFields.forEach(rf => newFields[rf] = node.config.defaultValue || null);
        }
        return { ...row, ...newFields };
    });
};

const processRouter = (node: RouterTransformation, batch: DataRow[], parameters: Record<string, string>): Record<string, DataRow[]> => {
    const results: Record<string, DataRow[]> = {};
    node.config.routes.forEach(r => results[r.groupName] = []);
    results[node.config.defaultGroup] = [];

    batch.forEach(row => {
        let routed = false;
        for (const route of node.config.routes) {
            if (evaluateExpression(row, route.condition, parameters)) {
                results[route.groupName].push(row);
                routed = true;
                break;
            }
        }
        if (!routed) {
            results[node.config.defaultGroup].push(row);
        }
    });
    return results;
};

const processSorter = (node: SorterTransformation, batch: DataRow[]): DataRow[] => {
    return [...batch].sort((a, b) => {
        for (const sf of node.config.sortFields) {
            const valA = a[sf.field];
            const valB = b[sf.field];
            if (valA === valB) continue;
            const dir = sf.direction === 'asc' ? 1 : -1;
            if (valA === undefined || valA === null) return 1 * dir;
            if (valB === undefined || valB === null) return -1 * dir;
            return valA > valB ? 1 * dir : -1 * dir;
        }
        return 0;
    });
};

const processUnion = (
    node: UnionTransformation,
    batch: DataRow[],
    mapping: Mapping,
    stats: ExecutionStats
): DataRow[] | null => {
    const unionCacheKey = `union_${node.id}`;
    const incomingLinks = mapping.links.filter(l => l.targetId === node.id);
    if (!stats.cache) stats.cache = {};
    if (!stats.cache[unionCacheKey]) {
        stats.cache[unionCacheKey] = { batches: [batch], received: 1 };
    } else {
        const cache = stats.cache[unionCacheKey] as { batches: DataRow[][]; received: number };
        cache.batches.push(batch);
        cache.received++;
    }
    const cache = stats.cache[unionCacheKey] as { batches: DataRow[][]; received: number };
    if (cache.received >= incomingLinks.length) {
        const result = cache.batches.flat();
        delete stats.cache[unionCacheKey];
        return result;
    }
    return null;
};

const processNormalizer = (node: NormalizerTransformation, batch: DataRow[]): DataRow[] => {
    const result: DataRow[] = [];
    batch.forEach(row => {
        const arr = row[node.config.arrayField];
        if (Array.isArray(arr)) {
            arr.forEach(item => {
                const newRow = node.config.keepOriginalFields ? { ...row } : {};
                if (typeof item === 'object' && item !== null) {
                    node.config.outputFields.forEach(f => {
                        newRow[f] = (item as any)[f];
                    });
                } else {
                    newRow[node.config.outputFields[0] || 'value'] = item;
                }
                result.push(newRow as DataRow);
            });
        } else {
            result.push(row);
        }
    });
    return result;
};

const processRank = (node: RankTransformation, batch: DataRow[]): DataRow[] => {
    // Group by partitionBy
    const groups: Record<string, DataRow[]> = {};
    batch.forEach(row => {
        const key = node.config.partitionBy.map(p => String(row[p])).join('::');
        if (!groups[key]) groups[key] = [];
        groups[key].push(row);
    });

    const result: DataRow[] = [];
    Object.values(groups).forEach(group => {
        const sorted = [...group].sort((a, b) => {
            for (const o of node.config.orderBy) {
                const valA = a[o.field];
                const valB = b[o.field];
                if (valA === valB) continue;
                const dir = o.direction === 'asc' ? 1 : -1;
                if (valA === undefined || valA === null) return 1 * dir;
                if (valB === undefined || valB === null) return -1 * dir;
                return valA > valB ? 1 * dir : -1 * dir;
            }
            return 0;
        });

        sorted.forEach((row, index) => {
            const newRow = { ...row };
            if (node.config.rankType === 'rowNumber') {
                newRow[node.config.rankField] = index + 1;
            } else {
                // Simplified rank/denseRank
                newRow[node.config.rankField] = index + 1;
            }
            result.push(newRow);
        });
    });
    return result;
};

const processSequence = (node: SequenceTransformation, batch: DataRow[], state: ExecutionState): DataRow[] => {
    if (!state.sequences) state.sequences = {};
    let current = state.sequences[node.id] ?? node.config.startValue;

    return batch.map(row => {
        const newRow = { ...row, [node.config.sequenceField]: current };
        current += node.config.incrementBy;
        state.sequences![node.id] = current;
        return newRow;
    });
};

const processUpdateStrategy = (node: UpdateStrategyTransformation, batch: DataRow[], parameters: Record<string, string>): DataRow[] => {
    return batch.map(row => {
        let strategy = node.config.defaultStrategy;
        for (const cond of node.config.conditions) {
            if (evaluateExpression(row, cond.condition, parameters)) {
                strategy = cond.strategy;
                break;
            }
        }
        return { ...row, [node.config.strategyField]: strategy };
    });
};

const processCleansing = (node: CleansingTransformation, batch: DataRow[]): DataRow[] => {
    // Pre-compile regexes for 'replace' rules
    const compiledRules = node.config.rules.map(rule => {
        let regex: RegExp | undefined;
        if (rule.operation === 'replace' && rule.replacePattern) {
            try {
                regex = new RegExp(rule.replacePattern, 'g');
            } catch (e) {
                console.warn(`[MappingEngine] Invalid regex in cleansing rule for field ${rule.field}: ${rule.replacePattern}`, e);
            }
        }
        return { ...rule, regex };
    });

    return batch.map(row => {
        const newRow = { ...row };
        compiledRules.forEach(rule => {
            let val = newRow[rule.field];
            if (rule.operation === 'trim' && typeof val === 'string') val = val.trim();
            if (rule.operation === 'upper' && typeof val === 'string') val = val.toUpperCase();
            if (rule.operation === 'lower' && typeof val === 'string') val = val.toLowerCase();
            if (rule.operation === 'nullToDefault' && (val === null || val === undefined)) val = rule.defaultValue;
            if (rule.operation === 'replace' && typeof val === 'string' && rule.regex) {
                val = val.replace(rule.regex, rule.replaceWith || '');
            }
            newRow[rule.field] = val as DataValue;
        });
        return newRow;
    });
};

const processDeduplicator = (node: DeduplicatorTransformation, batch: DataRow[]): DataRow[] => {
    const seen = new Set<string>();
    return batch.filter(row => {
        const key = node.config.keys.map(k => {
            const val = String(row[k]);
            return node.config.caseInsensitive ? val.toLowerCase() : val;
        }).join('::');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

const processPivot = (node: PivotTransformation, batch: DataRow[]): DataRow[] => {
    // Simplified pivot
    const groups: Record<string, DataRow> = {};
    batch.forEach(row => {
        const groupKey = node.config.groupByFields.map(f => String(row[f])).join('::');
        if (!groups[groupKey]) {
            const newRow: DataRow = {};
            node.config.groupByFields.forEach(f => newRow[f] = row[f]);
            groups[groupKey] = newRow;
        }
        const pivotVal = String(row[node.config.pivotField]);
        groups[groupKey][pivotVal] = row[node.config.valueField];
    });
    return Object.values(groups);
};

const processUnpivot = (node: UnpivotTransformation, batch: DataRow[]): DataRow[] => {
    const result: DataRow[] = [];
    batch.forEach(row => {
        node.config.fieldsToUnpivot.forEach(f => {
            if (row[f] !== undefined) {
                const newRow = { ...row };
                node.config.fieldsToUnpivot.forEach(of => delete newRow[of]);
                newRow[node.config.newHeaderFieldName] = f;
                newRow[node.config.newValueFieldName] = row[f];
                result.push(newRow);
            }
        });
    });
    return result;
};

const processSql = async (node: SqlTransformation, batch: DataRow[], _db: DbOps, parameters: Record<string, string>): Promise<DataRow[]> => {
    const sqlQuery = substituteParams(node.config.sqlQuery, parameters);
    // Simulated SQL execution with parameter substitution logic preserved for future extension
    if (sqlQuery) { /* use sqlQuery */ }
    
    await delay(30);
    return batch; // Current implementation is a pass-through
};

const processWebService = async (node: WebServiceTransformation, batch: DataRow[], parameters: Record<string, string>): Promise<DataRow[]> => {
    const url = substituteParams(node.config.url, parameters);
    // Simulate network delay
    await delay(50);
    
    // Simple mock logic using url
    if (url) { /* use url */ }

    return batch; // Current implementation is a pass-through
};

const processHierarchyParser = (node: HierarchyParserTransformation, batch: DataRow[]): DataRow[] => {
    return batch.map(row => {
        const input = row[node.config.inputField];
        if (typeof input === 'string') {
            try {
                const parsed = JSON.parse(input);
                const newRow = { ...row };
                node.config.outputFields.forEach(f => {
                    newRow[f.name] = getValueByPath(parsed, f.path);
                });
                return newRow;
            } catch {
                return row;
            }
        }
        return row;
    });
};

// Async Traverse with Observer
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
    _task: MappingTask,
    observer?: ExecutionObserver
) => {
    // Find next nodes
    const outgoingLinks = mapping.links.filter(l => l.sourceId === currentNode.id);
    
    // Group links by targetId to handle multiple links to same target (unlikely but possible)
    for (const link of outgoingLinks) {
        // Resolve input batch for this link
        let batch: DataRow[] = [];
        if (currentNode.type === 'router' && !Array.isArray(batchOrRouterResult)) {
             let defaultGroup = 'default';
             if ('defaultGroup' in currentNode.config) {
                 defaultGroup = (currentNode.config as any).defaultGroup;
             }
             const groupName = link.routerGroup || defaultGroup;
             batch = (batchOrRouterResult as Record<string, DataRow[]>)[groupName] || [];
        } else {
             batch = batchOrRouterResult as DataRow[];
        }

        const nextNode = mapping.transformations.find(t => t.id === link.targetId);
        if (!nextNode) continue;

        // Simulate processing delay for "Realism"
        await delay(50); // 50ms per node step

        let processedBatch: DataRow[] | Record<string, DataRow[]> = [];

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

        try {
            switch (nextNode.type) {
                case 'filter': {
                    processedBatch = processFilter(nextNode, batch, parameters);
                    break;
                }
                case 'expression': {
                    processedBatch = processExpression(nextNode, batch, parameters);
                    break;
                }
                case 'aggregator': {
                    processedBatch = processAggregator(nextNode, batch);
                    break;
                }
                case 'validator': {
                    processedBatch = processValidator(nextNode, batch, stats, _task);
                    break;
                }
                case 'target': {
                    processedBatch = await processTarget(nextNode, batch, connections, tables, topics, fs, db, stats, _task);
                    break;
                }
                case 'joiner': {
                    const result = processJoiner(nextNode, batch, mapping, stats);
                    if (result === null) {
                        processedBatch = [];
                    } else {
                        processedBatch = result;
                    }
                    break;
                }
                case 'lookup': {
                    processedBatch = processLookup(nextNode, batch, connections, db);
                    break;
                }
                case 'router': {
                    const routed = processRouter(nextNode, batch, parameters);
                    processedBatch = routed;
                    break;
                }
                case 'sorter': {
                    processedBatch = processSorter(nextNode, batch);
                    break;
                }
                case 'union': {
                    const result = processUnion(nextNode, batch, mapping, stats);
                    processedBatch = result || [];
                    break;
                }
                case 'normalizer': {
                    processedBatch = processNormalizer(nextNode, batch);
                    break;
                }
                case 'rank': {
                    processedBatch = processRank(nextNode, batch);
                    break;
                }
                case 'sequence': {
                    processedBatch = processSequence(nextNode, batch, state);
                    break;
                }
                case 'updateStrategy': {
                    processedBatch = processUpdateStrategy(nextNode, batch, parameters);
                    break;
                }
                case 'cleansing': {
                    processedBatch = processCleansing(nextNode, batch);
                    break;
                }
                case 'deduplicator': {
                    processedBatch = processDeduplicator(nextNode, batch);
                    break;
                }
                case 'pivot': {
                    processedBatch = processPivot(nextNode, batch);
                    break;
                }
                case 'unpivot': {
                    processedBatch = processUnpivot(nextNode, batch);
                    break;
                }
                case 'sql': {
                    processedBatch = await processSql(nextNode, batch, db, parameters);
                    break;
                }
                case 'webService': {
                    processedBatch = await processWebService(nextNode, batch, parameters);
                    break;
                }
                case 'hierarchyParser': {
                    processedBatch = processHierarchyParser(nextNode, batch);
                    break;
                }
                case 'source': {
                    processedBatch = batch;
                    break;
                }
                default:
                    processedBatch = batch;
                    break;
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

            checkStopOnErrors(stats, _task);
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
            await traverseAsync(nextNode, processedBatch, mapping, connections, tables, topics, fs, db, stats, state, parameters, _task, observer);
        }
    }
};

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
                           const val = line.substring(idx+1).trim();
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
                const content = fs.readFile(conn.host, path, file.name);
                if (file.name.endsWith('.csv')) {
                    try {
                        const lines = content.split(/\r?\n/);
                        if (lines.length > 0) {
                            const headers = lines[0].split(',');
                            records = lines.slice(1).filter(l => l.trim()).map(line => {
                                const vals = line.split(',');
                                const rec: DataRow = {};
                                headers.forEach((h, i) => rec[h.trim()] = vals[i]?.trim());
                                return rec;
                            });
                        }
                    } catch (e) {
                        console.error(`[MappingEngine] Failed to parse CSV file: ${file.name}`, e);
                        stats.transformations[sourceNode.id].errors++;
                        if (!stats.rejectRows) stats.rejectRows = [];
                        stats.rejectRows.push({
                            row: { file: file.name },
                            error: `Failed to parse CSV: ${e instanceof Error ? e.message : String(e)}`,
                            transformationName: sourceNode.name
                        });
                    }
                } else {
                    try {
                        const parsed = JSON.parse(content);
                        records = Array.isArray(parsed) ? parsed : [parsed];
                    } catch {
                        records = [{ file: file.name, content: content }];
                    }
                }

                if (config.filenameColumn && config.filenameColumn.trim()) {
                    records = records.map(rec => ({
                        ...rec,
                        [config.filenameColumn!]: file.name
                    }));
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
            
            // Database records might have insertedAt
            records = raw.filter((r: any) => (r.insertedAt || 0) > lastTs).map(r => ({ 
                ...extractData(r), 
                insertedAt: (r as any).insertedAt 
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
