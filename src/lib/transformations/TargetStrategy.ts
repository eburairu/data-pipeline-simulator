/**
 * TargetStrategy - ターゲット変換のStrategy実装
 * 
 * トピック、データベース、またはファイルにデータを書き出します。
 */

import type { TargetTransformation } from '../MappingTypes';
import type { DataRow } from '../types';
import type {
    TransformationStrategy,
    TransformationContext,
    TransformationResult,
    ValidationResult,
    DbRecord,
} from './types';

/**
 * 遅延ヘルパー
 */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * ターゲット変換のStrategy
 */
export class TargetStrategy implements TransformationStrategy<TargetTransformation> {
    readonly type = 'target' as const;

    async execute(
        node: TargetTransformation,
        context: TransformationContext
    ): Promise<TransformationResult> {
        const { batch, connections, tables, topics, fs, db, stats } = context;
        const processedBatch: DataRow[] = [];

        // Topic Target Processing
        if (node.config.targetType === 'topic' && node.config.topicId) {
            const topic = topics.find(t => t.id === node.config.topicId);
            if (!topic) {
                stats.transformations[node.id].errors += batch.length;
                return { output: [], continue: false, error: `Topic not found: ${node.config.topicId}` };
            }

            const validBatch: DataRow[] = [];
            for (const row of batch) {
                let isValid = true;
                const cleanRow: DataRow = {};
                const rawRow = { ...row };
                delete rawRow['_strategy'];

                if (topic.schema && topic.schema.length > 0) {
                    for (const field of topic.schema) {
                        let val = rawRow[field.name];
                        if (val === undefined || val === null) {
                            if (topic.schemaEnforcement === 'strict') {
                                isValid = false; break;
                            }
                            val = null;
                        }
                        if (val !== null && field.type === 'number') {
                            if (typeof val !== 'number') {
                                if (topic.schemaEnforcement === 'strict') {
                                    isValid = false; break;
                                }
                                const num = Number(val);
                                val = isNaN(num) ? null : num;
                            }
                        }
                        cleanRow[field.name] = val;
                    }
                    if (isValid && topic.schemaEnforcement === 'strict') {
                        for (const key of Object.keys(rawRow)) {
                            if (!topic.schema.some(f => f.name === key)) {
                                isValid = false; break;
                            }
                        }
                    }
                } else {
                    Object.assign(cleanRow, rawRow);
                }

                if (isValid) {
                    validBatch.push(cleanRow);
                } else {
                    stats.transformations[node.id].rejects++;
                    if (!stats.rejectRows) stats.rejectRows = [];
                    if (stats.rejectRows.length < 100) {
                        stats.rejectRows.push({ row, error: 'Schema Validation Failed', transformationName: node.name });
                    }
                }
            }

            if (validBatch.length > 0) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = `data_${timestamp}_${Math.random().toString(36).substr(2, 5)}.json`;
                const content = JSON.stringify(validBatch, null, 2);
                fs.writeFile('localhost', `/topics/${topic.id}/`, filename, content);
                processedBatch.push(...validBatch);
            }
            return { output: processedBatch, continue: true };
        }

        // Connection Target Processing
        const targetConn = connections.find(c => c.id === node.config.connectionId);
        if (!targetConn) {
            return { output: batch, continue: true };
        }

        if (targetConn.type === 'database') {
            const tableName = node.config.tableName || 'output';
            const tableDef = tables.find(t => t.name === tableName);
            const updateCols = node.config.updateColumns || [];
            const dedupKeys = node.config.deduplicationKeys || [];
            // Use first column as primary key if no explicit pk
            const pkColumn = tableDef?.columns?.[0]?.name || 'id';

            await delay(20); // Simulate DB latency

            for (const row of batch) {
                const cleanRow = { ...row };
                delete cleanRow['_strategy'];
                const strategy = row['_strategy'] || 'insert';

                if (strategy === 'delete') {
                    db.delete(tableName, String(cleanRow[pkColumn]));
                } else if (strategy === 'update' && updateCols.length > 0) {
                    const existing = db.select(tableName).find(r => {
                        const d = (r && typeof r === 'object' && 'data' in r) ? (r as DbRecord).data : r;
                        return d && (d as DataRow)[pkColumn] === cleanRow[pkColumn];
                    });
                    if (existing) {
                        const id = (existing && typeof existing === 'object' && 'id' in existing)
                            ? (existing as DbRecord).id
                            : String(cleanRow[pkColumn]);
                        db.update(tableName, id, cleanRow);
                    } else {
                        db.insert(tableName, cleanRow);
                    }
                } else {
                    // Insert with deduplication check
                    if (dedupKeys.length > 0) {
                        const existing = db.select(tableName).find(r => {
                            const d = (r && typeof r === 'object' && 'data' in r) ? (r as DbRecord).data : r as DataRow;
                            return dedupKeys.every(k => d[k] === cleanRow[k]);
                        });
                        if (existing) {
                            if (node.config.duplicateBehavior === 'update') {
                                const id = (existing && typeof existing === 'object' && 'id' in existing)
                                    ? (existing as DbRecord).id
                                    : '';
                                db.update(tableName, id, cleanRow);
                            }
                            // error/ignore: skip
                            continue;
                        }
                    }
                    db.insert(tableName, cleanRow);
                }
                processedBatch.push(cleanRow);
            }
        } else if (targetConn.type === 'file') {
            const path = node.config.path || '/output';
            const host = targetConn.host || 'localhost';
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const baseName = `output_${timestamp}_${Math.random().toString(36).substr(2, 5)}`;

            const content = JSON.stringify(batch, null, 2);
            const filename = `${baseName}.json`;

            fs.writeFile(host, path, filename, content);
            processedBatch.push(...batch);
        }

        return { output: processedBatch, continue: true };
    }

    validate(node: TargetTransformation): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!node.config?.connectionId && !node.config?.topicId) {
            errors.push('コネクションIDまたはトピックIDが指定されていません');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
}

export const targetStrategy = new TargetStrategy();
