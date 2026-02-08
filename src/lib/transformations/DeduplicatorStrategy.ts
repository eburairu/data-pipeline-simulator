/**
 * DeduplicatorStrategy - 重複排除変換のStrategy実装
 * 
 * 指定されたキーに基づいて重複行を削除します。
 */

import type { DeduplicatorTransformation } from '../MappingTypes';
import type {
    TransformationStrategy,
    TransformationContext,
    TransformationResult,
    ValidationResult,
} from './types';

/**
 * 重複排除変換のStrategy
 */
export class DeduplicatorStrategy implements TransformationStrategy<DeduplicatorTransformation> {
    readonly type = 'deduplicator' as const;

    async execute(
        node: DeduplicatorTransformation,
        context: TransformationContext
    ): Promise<TransformationResult> {
        const { batch } = context;

        const seen = new Set<string>();
        const output = batch.filter(row => {
            const key = node.config.keys.map(k => {
                const val = String(row[k]);
                return node.config.caseInsensitive ? val.toLowerCase() : val;
            }).join('::');

            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        return {
            output,
            continue: true,
        };
    }

    validate(node: DeduplicatorTransformation): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!node.config?.keys || node.config.keys.length === 0) {
            errors.push('重複判定キーが指定されていません');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
}

export const deduplicatorStrategy = new DeduplicatorStrategy();
