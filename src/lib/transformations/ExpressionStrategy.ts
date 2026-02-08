/**
 * ExpressionStrategy - 式評価変換のStrategy実装
 * 
 * フィールド値を式で計算して新しいフィールドを追加します。
 */

import type { ExpressionTransformation } from '../MappingTypes';
import type {
    TransformationStrategy,
    TransformationContext,
    TransformationResult,
    ValidationResult,
} from './types';
import { safeEvaluateExpression } from '../SafeExpressionEvaluator';

/**
 * 式評価変換のStrategy
 */
export class ExpressionStrategy implements TransformationStrategy<ExpressionTransformation> {
    readonly type = 'expression' as const;

    async execute(
        node: ExpressionTransformation,
        context: TransformationContext
    ): Promise<TransformationResult> {
        const { batch, parameters } = context;

        const output = batch.map(row => {
            const newRow = { ...row };
            for (const field of node.config.fields) {
                newRow[field.name] = safeEvaluateExpression(row, field.expression, parameters);
            }
            return newRow;
        });

        return {
            output,
            continue: true,
        };
    }

    validate(node: ExpressionTransformation): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!node.config?.fields || node.config.fields.length === 0) {
            errors.push('式フィールドが定義されていません');
        }

        for (const field of node.config?.fields || []) {
            if (!field.name) {
                errors.push('フィールド名が空です');
            }
            if (!field.expression) {
                errors.push(`フィールド "${field.name}" の式が空です`);
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
}

// デフォルトインスタンスをエクスポート
export const expressionStrategy = new ExpressionStrategy();
