/**
 * SourceStrategy - ソース変換のStrategy実装
 * 
 * ファイルまたはデータベースからデータを読み込みます。
 */

import type { SourceTransformation } from '../MappingTypes';
import type { DataRow } from '../types';
import type {
    TransformationStrategy,
    TransformationContext,
    TransformationResult,
    ValidationResult,
} from './types';

/**
 * CSVをパースするヘルパー
 */
function parseCSV(content: string): DataRow[] {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const rows: DataRow[] = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const row: DataRow = {};
        headers.forEach((h, idx) => {
            let val: string | number = values[idx]?.trim() ?? '';
            const numVal = Number(val);
            if (!isNaN(numVal) && val !== '') {
                row[h] = numVal;
            } else {
                row[h] = val;
            }
        });
        rows.push(row);
    }
    return rows;
}

/**
 * JSONをパースするヘルパー
 */
function parseJSON(content: string): DataRow[] {
    try {
        const parsed = JSON.parse(content);
        return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
        return [];
    }
}

/**
 * ソース変換のStrategy
 */
export class SourceStrategy implements TransformationStrategy<SourceTransformation> {
    readonly type = 'source' as const;

    async execute(
        node: SourceTransformation,
        context: TransformationContext
    ): Promise<TransformationResult> {
        const { connections, fs, db, state } = context;

        const conn = connections.find(c => c.id === node.config.connectionId);
        if (!conn) {
            return { output: [], continue: false, error: 'Connection not found' };
        }

        const output: DataRow[] = [];

        if (conn.type === 'file') {
            // ファイルからの読み込み
            const path = node.config.path || '/';
            const host = conn.host || 'localhost';
            const files = fs.listFiles(host, path);

            if (!state.processedFiles) state.processedFiles = new Set();

            for (const file of files) {
                if (state.processedFiles.has(`${host}:${path}/${file.name}`)) continue;

                const content = file.content;

                // パース
                let rows: DataRow[];
                if (file.name.endsWith('.json')) {
                    rows = parseJSON(content);
                } else {
                    rows = parseCSV(content);
                }

                // ファイル名列の追加
                if (node.config.filenameColumn) {
                    rows = rows.map(r => ({ ...r, [node.config.filenameColumn!]: file.name }));
                }

                output.push(...rows);
                state.processedFiles.add(`${host}:${path}/${file.name}`);

                // 読み取り後削除
                if (node.config.deleteAfterRead) {
                    fs.deleteFile(host, file.name, path);
                }
            }
        } else if (conn.type === 'database') {
            // データベースからの読み込み
            const tableName = node.config.tableName || 'input';
            const records = db.select(tableName);

            for (const record of records) {
                if (record && typeof record === 'object' && 'data' in record) {
                    output.push((record as { data: DataRow }).data);
                } else {
                    output.push(record as DataRow);
                }
            }
        }

        return {
            output,
            continue: output.length > 0,
        };
    }

    validate(node: SourceTransformation): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!node.config?.connectionId) {
            errors.push('コネクションIDが指定されていません');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
}

export const sourceStrategy = new SourceStrategy();
