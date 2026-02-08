/**
 * NormalizerStrategy - 正規化変換のStrategy実装
 * 
 * 配列フィールドを展開して複数行に変換します。
 */

import type { NormalizerTransformation } from '../MappingTypes';
import type { DataRow, DataValue } from '../types';
import type {
    TransformationStrategy,
    TransformationContext,
    TransformationResult,
    ValidationResult,
} from './types';

/**
 * 正規化変換のStrategy
 */
export class NormalizerStrategy implements TransformationStrategy<NormalizerTransformation> {
    readonly type = 'normalizer' as const;

    async execute(
        node: NormalizerTransformation,
        context: TransformationContext
    ): Promise<TransformationResult> {
        const { batch } = context;
        const output: DataRow[] = [];

        for (const row of batch) {
            const arr = row[node.config.arrayField];

            if (Array.isArray(arr)) {
                for (const item of arr) {
                    const newRow = node.config.keepOriginalFields ? { ...row } : {};

                    if (typeof item === 'object' && item !== null) {
                        for (const f of node.config.outputFields) {
                            newRow[f] = (item as Record<string, DataValue>)[f];
                        }
                    } else {
                        newRow[node.config.outputFields[0] || 'value'] = item as DataValue;
                    }

                    output.push(newRow);
                }
            } else {
                output.push(row);
            }
        }

        return {
            output,
            continue: true,
        };
    }

    validate(node: NormalizerTransformation): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!node.config?.arrayField) {
            errors.push('配列フィールドが指定されていません');
        }

        if (!node.config?.outputFields || node.config.outputFields.length === 0) {
            errors.push('出力フィールドが指定されていません');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
}

export const normalizerStrategy = new NormalizerStrategy();
