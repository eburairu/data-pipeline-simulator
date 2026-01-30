import {
    type Mapping,
    type MappingTask,
    type Transformation,
    type SourceConfig,
    type TargetConfig,
    type FilterConfig,
    type ExpressionConfig,
    type AggregatorConfig,
    type ValidatorConfig,
    type JoinerConfig,
    type LookupConfig,
    type RouterConfig,
    type SorterConfig,
    type NormalizerConfig,
    type RankConfig,
    type SequenceConfig,
    type UpdateStrategyConfig,
    type CleansingConfig,
    type DeduplicatorConfig,
    type PivotConfig,
    type UnpivotConfig,
    type SqlConfig
} from './MappingTypes';
import { type ConnectionDefinition, type TableDefinition } from './SettingsContext';
import { ExpressionFunctions } from './ExpressionFunctions';

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
    update: (tableName: string, id: string, record: any) => void;
    delete: (tableName: string, id: string) => void;
}

export interface ExecutionStats {
    transformations: { [transformationId: string]: { input: number; output: number; errors: number; rejects: number } };
    rejectRows?: { row: any; error: string; transformationName: string }[];
    cache?: { [key: string]: any };
}

export interface ExecutionState {
    processedFiles?: Set<string>;
    lastProcessedTimestamp?: number;
    [key: string]: any;
}

// Helper to evaluate conditions/expressions safely-ish
const evaluateExpression = (record: any, expression: string, parameters: Record<string, string> = {}): any => {
    try {
        // Allow accessing record fields like "amount" or "record.amount"
        // Also allow accessing parameters like "PARAM_1"
        // And standard functions like "IIF", "ISNULL", etc.

        const recordKeys = Object.keys(record);
        const recordValues = Object.values(record);

        const paramKeys = Object.keys(parameters);
        const paramValues = Object.values(parameters);

        const funcKeys = Object.keys(ExpressionFunctions);
        const funcValues = Object.values(ExpressionFunctions);

        // Create a function with keys as arguments
        // Order: Record Fields, Parameters, Functions
        const func = new Function(...recordKeys, ...paramKeys, ...funcKeys, `return ${expression};`);
        return func(...recordValues, ...paramValues, ...funcValues);
    } catch (e) {
        // console.warn(`Expression evaluation failed: ${expression}`, e);
        return null;
    }
};

// Helper to substitute parameters in string config values
const substituteParams = (str: string, params: Record<string, string>): string => {
    if (!str || typeof str !== 'string') return str;
    return str.replace(/\$\{(\w+)\}/g, (_, key) => params[key] || '');
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
    stats: ExecutionStats,
    parameters: Record<string, string> = {}
) => {
    // Find next nodes
    const outgoingLinks = mapping.links.filter(l => l.sourceId === currentNode.id);
    const nextNodes = outgoingLinks.map(l => mapping.transformations.find(t => t.id === l.targetId)).filter(Boolean) as Transformation[];

    for (const nextNode of nextNodes) {
        let processedBatch: any[] = [];
        stats.transformations[nextNode.id].input += batch.length;

        try {
            switch (nextNode.type) {
                case 'filter': {
                    const conf = nextNode.config as FilterConfig;
                    processedBatch = batch.filter(row => evaluateExpression(row, conf.condition, parameters));
                    break;
                }
                case 'expression': {
                    const conf = nextNode.config as ExpressionConfig;
                    processedBatch = batch.map(row => {
                        const newRow = { ...row };
                        conf.fields.forEach(f => {
                            newRow[f.name] = evaluateExpression(row, f.expression, parameters);
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
                case 'validator': {
                    const conf = nextNode.config as ValidatorConfig;
                    const rules = conf.rules || [];
                    const validRows: any[] = [];

                    for (const row of batch) {
                        let isValid = true;
                        for (const rule of rules) {
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

                                // Regex check
                                if (rule.regex) {
                                    try {
                                        const re = new RegExp(rule.regex);
                                        if (!re.test(String(val))) {
                                            isValid = false; break;
                                        }
                                    } catch (e) {
                                        console.warn(`[MappingEngine] Invalid regex in validator: ${rule.regex}`);
                                    }
                                }
                            }
                        }

                        if (isValid) {
                            validRows.push(row);
                        } else {
                            if (conf.errorBehavior === 'error') {
                                if (!stats.rejectRows) stats.rejectRows = [];
                                stats.rejectRows.push({
                                    row: row,
                                    error: `Validation failed: Rule validation error`,
                                    transformationName: nextNode.name
                                });
                                stats.transformations[nextNode.id].errors++;
                            }
                            // 'skip' behavior: simply drop the row
                        }
                    }
                    processedBatch = validRows;
                    break;
                }
                case 'target': {
                    const conf = nextNode.config as TargetConfig;
                    const targetConn = connections.find(c => c.id === conf.connectionId);
                    processedBatch = []; // Re-build processedBatch based on strategy

                    if (targetConn) {
                        if (targetConn.type === 'database') {
                            const tableName = targetConn.tableName || 'output';
                            const tableDef = tables.find(t => t.name === tableName);
                            const updateCols = conf.updateColumns || [];

                            batch.forEach(row => {
                                const strategy = row['_strategy'] || 'insert'; // Default to insert
                                const rowToProcess = { ...row };
                                delete rowToProcess['_strategy']; // Remove internal flag

                                if (strategy === 'reject') {
                                    stats.transformations[nextNode.id].rejects++;
                                    return; // Skip downstream
                                }

                                // Apply field mapping (simple: match names)
                                let recordToDb = rowToProcess;
                                if (tableDef) {
                                    const filtered: any = {};
                                    tableDef.columns.forEach(col => {
                                        if (Object.prototype.hasOwnProperty.call(rowToProcess, col.name)) {
                                            filtered[col.name] = rowToProcess[col.name];
                                        }
                                    });
                                    recordToDb = filtered;
                                }

                                if (strategy === 'insert') {
                                    // Idempotency Check
                                    const dedupKeys = conf.deduplicationKeys || [];
                                    const dupBehavior = conf.duplicateBehavior;

                                    let shouldInsert = true;
                                    let shouldUpdate = false;
                                    let matchId: string | null = null;

                                    if (dedupKeys.length > 0 && dupBehavior) {
                                        const allRecords = db.select(tableName);
                                        const match = allRecords.find((r: any) => {
                                            const data = r.data || r;
                                            return dedupKeys.every(k => String(data[k]) === String(row[k]));
                                        });

                                        if (match) {
                                            shouldInsert = false;
                                            matchId = match.id;
                                            if (dupBehavior === 'error') {
                                                stats.transformations[nextNode.id].errors++;
                                                console.warn(`[MappingEngine] Duplicate detected and treated as error: ${JSON.stringify(row)}`);
                                                return;
                                            } else if (dupBehavior === 'ignore') {
                                                console.log(`[MappingEngine] Duplicate ignored: ${JSON.stringify(row)}`);
                                                processedBatch.push(row); // Treat as success
                                                return;
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
                                    if (updateCols.length === 0) {
                                        console.warn(`[MappingEngine] ${strategy} requested but no updateColumns defined for ${nextNode.name}`);
                                        // Fallback to insert? No, risky. log error
                                        stats.transformations[nextNode.id].errors++;
                                        return;
                                    }

                                    // Find record to update/delete (Inefficient scan for simulation)
                                    // In real DB this would be a WHERE clause
                                    const allRecords = db.select(tableName);
                                    const match = allRecords.find((r: any) => {
                                        const data = r.data || r;
                                        return updateCols.every(col => String(data[col]) === String(row[col]));
                                    });

                                    if (match) {
                                        if (strategy === 'update') {
                                            db.update(tableName, match.id, recordToDb);
                                            processedBatch.push(row);
                                        } else if (strategy === 'delete') {
                                            db.delete(tableName, match.id);
                                            processedBatch.push(row);
                                        }
                                    } else {
                                        console.warn(`[MappingEngine] Record not found for ${strategy} in ${nextNode.name}`);
                                        // stats[nextNode.id].errors++; // Optional: treat as error or ignore?
                                    }
                                }
                            });
                        } else if (targetConn.type === 'file') {
                            // File targets typically only support append (insert) in this sim
                            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                            const filename = `output_${timestamp}.json`;
                            const cleanBatch = batch.map(r => {
                                const c = { ...r };
                                delete c['_strategy'];
                                return c;
                            });
                            const content = JSON.stringify(cleanBatch, null, 2);
                            fs.writeFile(targetConn.host!, targetConn.path!, filename, content);
                            processedBatch = cleanBatch;
                        }
                    } else {
                        processedBatch = batch;
                    }
                    break;
                }
                case 'joiner': {
                    // Joiner: 2つの入力を結合
                    // 最初の入力はキャッシュし、2番目の入力で結合を実行
                    const conf = nextNode.config as JoinerConfig;
                    const joinerCacheKey = `joiner_${nextNode.id}`;

                    // 入力エッジを取得（Joinerへの入力）
                    const incomingLinks = mapping.links.filter(l => l.targetId === nextNode.id);

                    if (incomingLinks.length < 2) {
                        // 2つの入力がない場合はそのまま通過
                        console.warn(`[MappingEngine] Joiner ${nextNode.name} requires 2 inputs, only ${incomingLinks.length} connected`);
                        processedBatch = batch;
                    } else {
                        // キャッシュを確認
                        if (!stats.cache) stats.cache = {};
                        if (!stats.cache[joinerCacheKey]) {
                            // 最初の入力: マスターとしてキャッシュ
                            stats.cache[joinerCacheKey] = { masterBatch: batch, received: 1 };
                            processedBatch = []; // 結合はまだ実行しない
                        } else {
                            // 2番目の入力: 結合を実行
                            const cache = stats.cache[joinerCacheKey];
                            const masterBatch = cache.masterBatch as any[];
                            const detailBatch = batch;

                            // 結合キーを取得
                            const masterKeys = conf.masterKeys || [];
                            const detailKeys = conf.detailKeys || [];

                            // 結合実行
                            const joinedRows: any[] = [];
                            const matchedDetailIndices = new Set<number>();

                            for (const masterRow of masterBatch) {
                                let matched = false;
                                for (let di = 0; di < detailBatch.length; di++) {
                                    const detailRow = detailBatch[di];
                                    // キー一致チェック
                                    let keysMatch = true;
                                    for (let ki = 0; ki < masterKeys.length; ki++) {
                                        const mk = masterKeys[ki];
                                        const dk = detailKeys[ki] || mk;
                                        if (masterRow[mk] !== detailRow[dk]) {
                                            keysMatch = false;
                                            break;
                                        }
                                    }
                                    if (keysMatch) {
                                        matched = true;
                                        matchedDetailIndices.add(di);
                                        // マスター + 詳細を結合
                                        joinedRows.push({ ...masterRow, ...detailRow });
                                    }
                                }

                                // Left/Full Join: マッチなしでもマスター行を含める
                                if (!matched && (conf.joinType === 'left' || conf.joinType === 'full')) {
                                    joinedRows.push({ ...masterRow });
                                }
                            }

                            // Right/Full Join: マッチしなかった詳細行を含める
                            if (conf.joinType === 'right' || conf.joinType === 'full') {
                                for (let di = 0; di < detailBatch.length; di++) {
                                    if (!matchedDetailIndices.has(di)) {
                                        joinedRows.push({ ...detailBatch[di] });
                                    }
                                }
                            }

                            processedBatch = joinedRows;
                            console.log(`[MappingEngine] Joiner ${nextNode.name}: ${conf.joinType} join produced ${joinedRows.length} rows`);

                            // キャッシュをクリア
                            delete stats.cache[joinerCacheKey];
                        }
                    }
                    break;
                }
                case 'lookup': {
                    // Lookup: 参照テーブルからデータを参照
                    const conf = nextNode.config as LookupConfig;
                    const lookupConn = connections.find(c => c.id === conf.connectionId);

                    if (lookupConn && lookupConn.type === 'database') {
                        const lookupData = db.select(lookupConn.tableName || '');
                        const lookupKeys = conf.lookupKeys || [];
                        const referenceKeys = conf.referenceKeys || [];
                        const returnFields = conf.returnFields || [];

                        processedBatch = batch.map(row => {
                            const newRow = { ...row };
                            // ルックアップテーブルから一致する行を検索
                            const matched = lookupData.find(lookupRow => {
                                const data = lookupRow.data || lookupRow;
                                for (let i = 0; i < lookupKeys.length; i++) {
                                    const inputKey = lookupKeys[i];
                                    const refKey = referenceKeys[i] || inputKey;
                                    if (row[inputKey] !== data[refKey]) {
                                        return false;
                                    }
                                }
                                return true;
                            });

                            if (matched) {
                                const data = matched.data || matched;
                                returnFields.forEach(field => {
                                    newRow[field] = data[field];
                                });
                            } else if (conf.defaultValue !== undefined) {
                                returnFields.forEach(field => {
                                    newRow[field] = conf.defaultValue;
                                });
                            }
                            return newRow;
                        });
                        console.log(`[MappingEngine] Lookup ${nextNode.name}: processed ${processedBatch.length} rows`);
                    } else {
                        console.warn(`[MappingEngine] Lookup ${nextNode.name}: invalid or missing connection`);
                        processedBatch = batch;
                    }
                    break;
                }
                case 'router': {
                    // Router: 条件に基づいて行を振り分け
                    const conf = nextNode.config as RouterConfig;
                    const routes = conf.routes || [];

                    // 各行を評価して振り分け先を決定
                    const routedGroups: Record<string, any[]> = {};
                    routedGroups[conf.defaultGroup || 'default'] = [];
                    routes.forEach(r => {
                        routedGroups[r.groupName] = [];
                    });

                    for (const row of batch) {
                        let routed = false;
                        for (const route of routes) {
                            try {
                                if (evaluateExpression(row, route.condition, parameters)) {
                                    routedGroups[route.groupName].push(row);
                                    routed = true;
                                    break; // 最初にマッチしたルートに振り分け
                                }
                            } catch (e) {
                                console.warn(`[MappingEngine] Router condition error: ${route.condition}`);
                            }
                        }
                        if (!routed) {
                            routedGroups[conf.defaultGroup || 'default'].push(row);
                        }
                    }

                    // デフォルトグループを次のノードに渡す
                    // 注: 現在の実装ではデフォルトグループのみが下流に流れる
                    // 将来的には複数出力エッジをサポート可能
                    processedBatch = routedGroups[conf.defaultGroup || 'default'];

                    console.log(`[MappingEngine] Router ${nextNode.name}: routed ${batch.length} rows into groups:`,
                        Object.entries(routedGroups).map(([k, v]) => `${k}:${v.length}`).join(', '));
                    break;
                }
                case 'sorter': {
                    // Sorter: 指定フィールドでソート
                    const conf = nextNode.config as SorterConfig;
                    const sortFields = conf.sortFields || [];

                    processedBatch = [...batch].sort((a, b) => {
                        for (const sf of sortFields) {
                            const aVal = a[sf.field];
                            const bVal = b[sf.field];

                            let comparison = 0;
                            if (typeof aVal === 'number' && typeof bVal === 'number') {
                                comparison = aVal - bVal;
                            } else {
                                comparison = String(aVal).localeCompare(String(bVal));
                            }

                            if (comparison !== 0) {
                                return sf.direction === 'desc' ? -comparison : comparison;
                            }
                        }
                        return 0;
                    });

                    console.log(`[MappingEngine] Sorter ${nextNode.name}: sorted ${processedBatch.length} rows`);
                    break;
                }
                case 'union': {
                    // Union: 複数入力をマージ
                    // Unionへの入力を蓄積し、全入力が揃ったら結合して出力
                    const unionCacheKey = `union_${nextNode.id}`;
                    const incomingLinks = mapping.links.filter(l => l.targetId === nextNode.id);

                    if (!stats.cache) stats.cache = {};
                    if (!stats.cache[unionCacheKey]) {
                        stats.cache[unionCacheKey] = { batches: [batch], received: 1 };
                    } else {
                        const cache = stats.cache[unionCacheKey];
                        cache.batches.push(batch);
                        cache.received++;
                    }

                    const cache = stats.cache[unionCacheKey];
                    if (cache.received >= incomingLinks.length) {
                        // すべての入力が揃った - マージして出力
                        processedBatch = cache.batches.flat();
                        console.log(`[MappingEngine] Union ${nextNode.name}: merged ${cache.received} inputs into ${processedBatch.length} rows`);
                        delete stats.cache[unionCacheKey];
                    } else {
                        // まだ全入力が揃っていない - 待機
                        processedBatch = [];
                    }
                    break;
                }
                case 'normalizer': {
                    // Normalizer: 1行を複数行に展開
                    const conf = nextNode.config as NormalizerConfig;
                    const arrayField = conf.arrayField || '';
                    const outputFields = conf.outputFields || [];

                    processedBatch = [];
                    for (const row of batch) {
                        const arrayValue = row[arrayField];
                        if (Array.isArray(arrayValue)) {
                            // 配列の各要素ごとに行を生成
                            arrayValue.forEach((item, idx) => {
                                const newRow = conf.keepOriginalFields ? { ...row } : {};
                                delete newRow[arrayField];  // 元の配列フィールドは削除
                                if (typeof item === 'object') {
                                    Object.assign(newRow, item);
                                } else {
                                    const fieldName = outputFields[idx] || `${arrayField}_${idx}`;
                                    newRow[fieldName] = item;
                                }
                                processedBatch.push(newRow);
                            });
                        } else {
                            // 配列でない場合はそのまま通過
                            processedBatch.push(row);
                        }
                    }
                    console.log(`[MappingEngine] Normalizer ${nextNode.name}: expanded ${batch.length} rows to ${processedBatch.length} rows`);
                    break;
                }
                case 'rank': {
                    // Rank: ランキング付与
                    const conf = nextNode.config as RankConfig;
                    const partitionBy = conf.partitionBy || [];
                    const orderBy = conf.orderBy || [];
                    const rankField = conf.rankField || 'rank';
                    const rankType = conf.rankType || 'rowNumber';

                    // パーティション分割
                    const partitions: Record<string, any[]> = {};
                    batch.forEach(row => {
                        const key = partitionBy.map(p => row[p]).join('::');
                        if (!partitions[key]) partitions[key] = [];
                        partitions[key].push(row);
                    });

                    processedBatch = [];
                    for (const partitionRows of Object.values(partitions)) {
                        // ソート
                        partitionRows.sort((a, b) => {
                            for (const ob of orderBy) {
                                const aVal = a[ob.field];
                                const bVal = b[ob.field];
                                let cmp = 0;
                                if (typeof aVal === 'number' && typeof bVal === 'number') {
                                    cmp = aVal - bVal;
                                } else {
                                    cmp = String(aVal).localeCompare(String(bVal));
                                }
                                if (cmp !== 0) return ob.direction === 'desc' ? -cmp : cmp;
                            }
                            return 0;
                        });

                        // ランク付与
                        let rank = 1;
                        let prevValues: any[] = [];
                        partitionRows.forEach((row, idx) => {
                            const currValues = orderBy.map(ob => row[ob.field]);
                            if (rankType === 'rowNumber') {
                                row[rankField] = idx + 1;
                            } else if (rankType === 'denseRank') {
                                if (idx > 0 && JSON.stringify(currValues) !== JSON.stringify(prevValues)) {
                                    rank++;
                                }
                                row[rankField] = rank;
                            } else { // rank
                                if (idx > 0 && JSON.stringify(currValues) !== JSON.stringify(prevValues)) {
                                    rank = idx + 1;
                                }
                                row[rankField] = rank;
                            }
                            prevValues = currValues;
                            processedBatch.push(row);
                        });
                    }
                    console.log(`[MappingEngine] Rank ${nextNode.name}: assigned ranks to ${processedBatch.length} rows`);
                    break;
                }
                case 'sequence': {
                    // Sequence: 連番生成
                    const conf = nextNode.config as SequenceConfig;
                    const seqField = conf.sequenceField || 'seq';
                    const startVal = conf.startValue ?? 1;
                    const incr = conf.incrementBy ?? 1;

                    processedBatch = batch.map((row, idx) => ({
                        ...row,
                        [seqField]: startVal + (idx * incr)
                    }));
                    console.log(`[MappingEngine] Sequence ${nextNode.name}: assigned sequence to ${processedBatch.length} rows`);
                    break;
                }
                case 'updateStrategy': {
                    // UpdateStrategy: Insert/Update/Deleteフラグ設定
                    const conf = nextNode.config as UpdateStrategyConfig;
                    const strategyField = conf.strategyField || '_strategy';
                    const defaultStrategy = conf.defaultStrategy || 'insert';
                    const conditions = conf.conditions || [];

                    processedBatch = batch.map(row => {
                        const newRow = { ...row };
                        let strategy = defaultStrategy;
                        for (const cond of conditions) {
                            try {
                                if (evaluateExpression(row, cond.condition, parameters)) {
                                    strategy = cond.strategy;
                                    break;
                                }
                            } catch (e) {
                                // 条件評価失敗時はデフォルトを使用
                            }
                        }
                        newRow[strategyField] = strategy;
                        return newRow;
                    });
                    console.log(`[MappingEngine] UpdateStrategy ${nextNode.name}: assigned strategies to ${processedBatch.length} rows`);
                    break;
                }
                case 'cleansing': {
                    // Cleansing: データクレンジング
                    const conf = nextNode.config as CleansingConfig;
                    const rules = conf.rules || [];

                    processedBatch = batch.map(row => {
                        const newRow = { ...row };
                        for (const rule of rules) {
                            const val = newRow[rule.field];
                            switch (rule.operation) {
                                case 'trim':
                                    if (typeof val === 'string') newRow[rule.field] = val.trim();
                                    break;
                                case 'upper':
                                    if (typeof val === 'string') newRow[rule.field] = val.toUpperCase();
                                    break;
                                case 'lower':
                                    if (typeof val === 'string') newRow[rule.field] = val.toLowerCase();
                                    break;
                                case 'nullToDefault':
                                    if (val === null || val === undefined || val === '') {
                                        newRow[rule.field] = rule.defaultValue ?? '';
                                    }
                                    break;
                                case 'replace':
                                    if (typeof val === 'string' && rule.replacePattern) {
                                        try {
                                            const re = new RegExp(rule.replacePattern, 'g');
                                            newRow[rule.field] = val.replace(re, rule.replaceWith ?? '');
                                        } catch (e) {
                                            // Invalid regex
                                        }
                                    }
                                    break;
                            }
                        }
                        return newRow;
                    });
                    console.log(`[MappingEngine] Cleansing ${nextNode.name}: cleansed ${processedBatch.length} rows`);
                    break;
                }
                case 'deduplicator': {
                    // Deduplicator: 重複除外
                    const conf = nextNode.config as DeduplicatorConfig;
                    const keys = conf.keys || [];
                    const caseInsensitive = conf.caseInsensitive || false;

                    const seen = new Set<string>();
                    processedBatch = batch.filter(row => {
                        let uniqueKey = '';
                        if (keys.length === 0) {
                            // 全フィールドをキーとする
                            uniqueKey = JSON.stringify(row);
                        } else {
                            uniqueKey = keys.map(k => {
                                const val = row[k];
                                return (caseInsensitive && typeof val === 'string') ? val.toLowerCase() : val;
                            }).join('::');
                        }

                        if (seen.has(uniqueKey)) {
                            return false;
                        }
                        seen.add(uniqueKey);
                        return true;
                    });
                    console.log(`[MappingEngine] Deduplicator ${nextNode.name}: reduced ${batch.length} to ${processedBatch.length} rows`);
                    break;
                }
                case 'pivot': {
                    // Pivot: 行→列変換（簡易実装）
                    const conf = nextNode.config as PivotConfig;
                    const groupByFields = conf.groupByFields || [];
                    const pivotField = conf.pivotField || '';
                    const valueField = conf.valueField || '';

                    if (!pivotField || !valueField) {
                        processedBatch = batch;
                        break;
                    }

                    // グループ化
                    const groups: Record<string, any> = {};
                    batch.forEach(row => {
                        const groupKey = groupByFields.map(k => row[k]).join('::');
                        if (!groups[groupKey]) {
                            groups[groupKey] = {};
                            groupByFields.forEach(k => groups[groupKey][k] = row[k]);
                        }

                        // ピボット列の値をキーにして値を格納
                        const pivotKey = row[pivotField];
                        if (pivotKey !== undefined && pivotKey !== null) {
                            groups[groupKey][String(pivotKey)] = row[valueField];
                        }
                    });

                    processedBatch = Object.values(groups);
                    console.log(`[MappingEngine] Pivot ${nextNode.name}: pivoted ${batch.length} rows to ${processedBatch.length} rows`);
                    break;
                }
                case 'unpivot': {
                    // Unpivot: 列→行変換
                    const conf = nextNode.config as UnpivotConfig;
                    const fieldsToUnpivot = conf.fieldsToUnpivot || [];
                    const headerField = conf.newHeaderFieldName || 'Metric';
                    const valueField = conf.newValueFieldName || 'Value';

                    processedBatch = [];
                    batch.forEach(row => {
                        fieldsToUnpivot.forEach(field => {
                            if (row[field] !== undefined) {
                                const newRow = { ...row };
                                // アンピボット対象フィールドは削除して、新しいヘッダーと値フィールドを追加
                                fieldsToUnpivot.forEach(f => delete newRow[f]);
                                newRow[headerField] = field;
                                newRow[valueField] = row[field];
                                processedBatch.push(newRow);
                            }
                        });
                        // アンピボット対象がない行はスキップされる（IDMC仕様に合わせるなら保持オプションが必要だが簡易実装）
                    });
                    console.log(`[MappingEngine] Unpivot ${nextNode.name}: expanded ${batch.length} rows to ${processedBatch.length} rows`);
                    break;
                }
                case 'sql': {
                    const conf = nextNode.config as SqlConfig;
                    const sqlQuery = substituteParams(conf.sqlQuery, parameters);
                    console.log(`[MappingEngine] SQL ${nextNode.name}: Executing "${sqlQuery}"`);

                    // Simple regex simulation for DELETE/UPDATE statements on VirtualDB
                    // Supported: "DELETE FROM table WHERE field = 'value'"
                    // Supported: "UPDATE table SET field = 'value' WHERE field = 'value'" (very basic)

                    if (conf.mode === 'script' || conf.mode === 'query') {
                        const sql = sqlQuery.trim();
                        const deleteMatch = sql.match(/DELETE\s+FROM\s+(\w+)\s+WHERE\s+(\w+)\s*=\s*['"]?([^'"]+)['"]?/i);

                        if (deleteMatch) {
                            const [, tableName, field, value] = deleteMatch;
                            const records = db.select(tableName);
                            let deletedCount = 0;
                            records.forEach((r: any) => {
                                const data = r.data || r;
                                if (String(data[field]) === String(value)) {
                                    db.delete(tableName, r.id);
                                    deletedCount++;
                                }
                            });
                            console.log(`[MappingEngine] SQL Executed: Deleted ${deletedCount} rows from ${tableName}`);
                        }
                    }

                    processedBatch = batch.map(row => ({ ...row, _sql_status: 'success' }));
                    break;
                }
                default:
                    processedBatch = batch;
            }
        } catch (e) {
            console.error(`Error in node ${nextNode.name}`, e);
            stats.transformations[nextNode.id].errors += 1;
            // Capture batch level error
            if (!stats.rejectRows) stats.rejectRows = [];
            stats.rejectRows.push({
                row: { batchSize: batch.length, sample: batch[0] },
                error: e instanceof Error ? e.message : String(e),
                transformationName: nextNode.name
            });
        }

        stats.transformations[nextNode.id].output += processedBatch.length;
        if (processedBatch.length > 0) {
            traverse(nextNode, processedBatch, mapping, connections, tables, fs, db, stats, parameters);
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

    const stats: ExecutionStats = { transformations: {}, rejectRows: [], cache: {} };
    const newState = { ...state };

    // Resolve Parameters
    // Priority: Task Parameters > Mapping Parameters > Defaults
    const startTime = new Date();
    const parameters = {
        'SYSDATE': startTime.toISOString(),
        'SESSSTARTTIME': startTime.toISOString(),
        ...(mapping.parameters || {}),
        ...(task.parameters || {})
    };

    mapping.transformations.forEach(t => {
        stats.transformations[t.id] = { input: 0, output: 0, errors: 0, rejects: 0 };
    });

    // Initialize rejectRows
    stats.rejectRows = [];

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

                // Add source filename as column if configured (IDMC CDI feature)
                if (config.filenameColumn && config.filenameColumn.trim()) {
                    records = records.map(rec => ({
                        ...rec,
                        [config.filenameColumn!]: file.name
                    }));
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
            records = raw.filter(r => r.insertedAt > lastTs).map(r => ({ ...r.data, insertedAt: r.insertedAt }));

            if (records.length > 0) {
                const maxTs = Math.max(...records.map(r => r.insertedAt));
                newState.lastProcessedTimestamp = maxTs;
            }
        }

        stats.transformations[sourceNode.id].input = records.length;
        stats.transformations[sourceNode.id].output = records.length;

        if (records.length > 0) {
            traverse(sourceNode, records, mapping, connections, tables, fs, db, stats, parameters);
        }
    }

    // Write Bad File if configured and errors exist
    if (task.badFileDir && stats.rejectRows && stats.rejectRows.length > 0) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `Bad_Rows_${task.name.replace(/\s+/g, '_')}_${timestamp}.csv`;
        const header = 'Transformation,Error,RowData\n';
        const content = stats.rejectRows.map(r => {
            const rowStr = JSON.stringify(r.row).replace(/"/g, '""'); // CSV escape
            return `"${r.transformationName}","${r.error}","${rowStr}"`;
        }).join('\n');

        // Use default if not specified
        const targetDir = task.badFileDir.endsWith('/') ? task.badFileDir : task.badFileDir + '/';

        try {
            // Write to localhost (simulated local execution environment)
            fs.writeFile('localhost', targetDir, filename, header + content);
            console.log(`[MappingEngine] Bad file created: ${targetDir}${filename}`);
        } catch (e) {
            console.error(`[MappingEngine] Failed to write bad file`, e);
        }
    }

    return { stats, newState };
}

export const executeMappingTask = executeMappingTaskRecursive;
