/**
 * FilterStrategy - フィルター変換のStrategy実装
 * 
 * 条件式に基づいてデータ行をフィルタリングします。
 */

import type { FilterTransformation } from '../MappingTypes';
import type {
    TransformationStrategy,
    TransformationContext,
    TransformationResult,
    ValidationResult,
} from './types';
import { safeEvaluateExpression } from '../SafeExpressionEvaluator';

/**
 * フィルター変換のStrategy
 */
export class FilterStrategy implements TransformationStrategy<FilterTransformation> {
    readonly type = 'filter' as const;

    async execute(
        node: FilterTransformation,
        context: TransformationContext
    ): Promise<TransformationResult> {
        const { batch, parameters } = context;

        const output = batch.filter(row =>
            safeEvaluateExpression(row, node.config.condition, parameters)
        );

        return {
            output,
            continue: true,
        };
    }

    validate(node: FilterTransformation): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!node.config?.condition) {
            errors.push('フィルター条件が指定されていません');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
}

// デフォルトインスタンスをエクスポート
export const filterStrategy = new FilterStrategy();
