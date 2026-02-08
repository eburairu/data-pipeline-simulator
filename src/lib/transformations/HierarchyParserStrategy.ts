/**
 * HierarchyParserStrategy - 階層パーサー変換のStrategy実装
 * 
 * 階層構造のデータ（JSON, XML等）をフラット化します。
 */

import type { HierarchyParserTransformation } from '../MappingTypes';
import type { DataRow, DataValue } from '../types';
import type {
    TransformationStrategy,
    TransformationContext,
    TransformationResult,
    ValidationResult,
} from './types';

/**
 * ネストした値を取得するヘルパー
 */
function getValueByPath(obj: unknown, path: string): DataValue {
    if (!path) return undefined;
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
        if (current === null || current === undefined) return undefined;

        const arrayMatch = part.match(/(\w+)\[(\d+)\]/);
        if (arrayMatch) {
            const arr = (current as Record<string, unknown>)[arrayMatch[1]];
            if (arr && Array.isArray(arr)) {
                current = arr[parseInt(arrayMatch[2])];
            } else {
                return undefined;
            }
        } else {
            current = (current as Record<string, unknown>)[part];
        }
    }

    return current as DataValue;
}

/**
 * 階層パーサー変換のStrategy
 */
export class HierarchyParserStrategy implements TransformationStrategy<HierarchyParserTransformation> {
    readonly type = 'hierarchyParser' as const;

    async execute(
        node: HierarchyParserTransformation,
        context: TransformationContext
    ): Promise<TransformationResult> {
        const { batch } = context;

        const output: DataRow[] = batch.map(row => {
            const inputValue = row[node.config.inputField];
            const newRow: DataRow = { ...row };

            // 入力が文字列の場合はJSONとしてパース
            let parsed: unknown = inputValue;
            if (typeof inputValue === 'string') {
                try {
                    parsed = JSON.parse(inputValue);
                } catch {
                    parsed = inputValue;
                }
            }

            for (const mapping of node.config.outputFields) {
                newRow[mapping.name] = getValueByPath(parsed, mapping.path);
            }

            return newRow;
        });

        return {
            output,
            continue: true,
        };
    }

    validate(node: HierarchyParserTransformation): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!node.config?.inputField) {
            errors.push('入力フィールドが指定されていません');
        }

        if (!node.config?.outputFields || node.config.outputFields.length === 0) {
            errors.push('出力フィールドマッピングが定義されていません');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
}

export const hierarchyParserStrategy = new HierarchyParserStrategy();
