/**
 * SorterStrategy - ソート変換のStrategy実装
 * 
 * 指定されたフィールドと方向でデータをソートします。
 */

import type { SorterTransformation } from '../MappingTypes';
import type {
    TransformationStrategy,
    TransformationContext,
    TransformationResult,
    ValidationResult,
} from './types';

/**
 * ソート変換のStrategy
 */
export class SorterStrategy implements TransformationStrategy<SorterTransformation> {
    readonly type = 'sorter' as const;

    async execute(
        node: SorterTransformation,
        context: TransformationContext
    ): Promise<TransformationResult> {
        const { batch } = context;

        const output = [...batch].sort((a, b) => {
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

        return {
            output,
            continue: true,
        };
    }

    validate(node: SorterTransformation): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!node.config?.sortFields || node.config.sortFields.length === 0) {
            errors.push('ソートフィールドが指定されていません');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
}

export const sorterStrategy = new SorterStrategy();
