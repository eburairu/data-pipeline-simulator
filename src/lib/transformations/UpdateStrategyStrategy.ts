/**
 * UpdateStrategyStrategy - 更新戦略変換のStrategy実装
 * 
 * 条件に基づいてInsert/Update/Delete/Rejectの戦略を決定します。
 */

import type { UpdateStrategyTransformation } from '../MappingTypes';
import type {
    TransformationStrategy,
    TransformationContext,
    TransformationResult,
    ValidationResult,
} from './types';
import { safeEvaluateExpression } from '../SafeExpressionEvaluator';

/**
 * 更新戦略変換のStrategy
 */
export class UpdateStrategyStrategy implements TransformationStrategy<UpdateStrategyTransformation> {
    readonly type = 'updateStrategy' as const;

    async execute(
        node: UpdateStrategyTransformation,
        context: TransformationContext
    ): Promise<TransformationResult> {
        const { batch, parameters } = context;

        const output = batch.map(row => {
            let strategy = node.config.defaultStrategy;

            for (const cond of node.config.conditions) {
                if (safeEvaluateExpression(row, cond.condition, parameters)) {
                    strategy = cond.strategy;
                    break;
                }
            }

            return { ...row, [node.config.strategyField]: strategy };
        });

        return {
            output,
            continue: true,
        };
    }

    validate(node: UpdateStrategyTransformation): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!node.config?.strategyField) {
            errors.push('戦略フィールド名が指定されていません');
        }

        if (!node.config?.defaultStrategy) {
            errors.push('デフォルト戦略が指定されていません');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
}

export const updateStrategyStrategy = new UpdateStrategyStrategy();
