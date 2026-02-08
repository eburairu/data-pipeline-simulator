/**
 * LookupStrategy - ルックアップ変換のStrategy実装
 * 
 * 参照テーブルからデータを検索して追加フィールドを付与します。
 */

import type { LookupTransformation } from '../MappingTypes';
import type { DataRow } from '../types';
import type {
    TransformationStrategy,
    TransformationContext,
    TransformationResult,
    ValidationResult,
    DbRecord,
} from './types';

/**
 * データからDataRowを抽出するヘルパー
 */
function extractData(record: unknown): DataRow {
    if (record && typeof record === 'object' && 'data' in record) {
        return (record as DbRecord).data;
    }
    return record as DataRow;
}

/**
 * ルックアップ変換のStrategy
 */
export class LookupStrategy implements TransformationStrategy<LookupTransformation> {
    readonly type = 'lookup' as const;

    async execute(
        node: LookupTransformation,
        context: TransformationContext
    ): Promise<TransformationResult> {
        const { batch, connections, db } = context;

        const conn = connections.find(c => c.id === node.config.connectionId);
        if (!conn || conn.type !== 'database') {
            return { output: batch, continue: true };
        }

        const tableName = node.config.tableName || 'lookup_table';
        const allLookupRecords = db.select(tableName);

        const output = batch.map(row => {
            const match = allLookupRecords.find(r => {
                const d = extractData(r);
                return node.config.lookupKeys.every((lk, i) =>
                    String(row[lk]) === String(d[node.config.referenceKeys[i]])
                );
            });

            const newFields: DataRow = {};
            if (match) {
                const d = extractData(match);
                node.config.returnFields.forEach(rf => newFields[rf] = d[rf]);
            } else {
                node.config.returnFields.forEach(rf => newFields[rf] = node.config.defaultValue ?? null);
            }

            return { ...row, ...newFields };
        });

        return {
            output,
            continue: true,
        };
    }

    validate(node: LookupTransformation): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!node.config?.connectionId) {
            errors.push('コネクションIDが指定されていません');
        }

        if (!node.config?.lookupKeys || node.config.lookupKeys.length === 0) {
            errors.push('ルックアップキーが指定されていません');
        }

        if (!node.config?.returnFields || node.config.returnFields.length === 0) {
            errors.push('返却フィールドが指定されていません');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
}

export const lookupStrategy = new LookupStrategy();
