/**
 * UnpivotStrategy - アンピボット変換のStrategy実装
 * 
 * 列を行に変換します（縦持ち変換）。
 */

import type { UnpivotTransformation } from '../MappingTypes';
import type { DataRow } from '../types';
import type {
    TransformationStrategy,
    TransformationContext,
    TransformationResult,
    ValidationResult,
} from './types';

/**
 * アンピボット変換のStrategy
 */
export class UnpivotStrategy implements TransformationStrategy<UnpivotTransformation> {
    readonly type = 'unpivot' as const;

    async execute(
        node: UnpivotTransformation,
        context: TransformationContext
    ): Promise<TransformationResult> {
        const { batch } = context;
        const output: DataRow[] = [];

        for (const row of batch) {
            for (const f of node.config.fieldsToUnpivot) {
                if (row[f] !== undefined) {
                    const newRow = { ...row };
                    // アンピボット対象フィールドを削除
                    node.config.fieldsToUnpivot.forEach(of => delete newRow[of]);
                    // ヘッダーと値を設定
                    newRow[node.config.newHeaderFieldName] = f;
                    newRow[node.config.newValueFieldName] = row[f];
                    output.push(newRow);
                }
            }
        }

        return {
            output,
            continue: true,
        };
    }

    validate(node: UnpivotTransformation): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!node.config?.fieldsToUnpivot || node.config.fieldsToUnpivot.length === 0) {
            errors.push('アンピボット対象フィールドが指定されていません');
        }

        if (!node.config?.newHeaderFieldName) {
            errors.push('新しいヘッダーフィールド名が指定されていません');
        }

        if (!node.config?.newValueFieldName) {
            errors.push('新しい値フィールド名が指定されていません');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
}

export const unpivotStrategy = new UnpivotStrategy();
