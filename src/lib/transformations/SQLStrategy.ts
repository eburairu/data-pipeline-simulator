/**
 * SQLStrategy - SQL変換のStrategy実装
 * 
 * SQLライクなクエリでデータを変換します（シミュレーション用）。
 */

import type { SqlTransformation } from '../MappingTypes';
import type {
    TransformationStrategy,
    TransformationContext,
    TransformationResult,
    ValidationResult,
} from './types';

/**
 * SQL変換のStrategy
 */
export class SQLStrategy implements TransformationStrategy<SqlTransformation> {
    readonly type = 'sql' as const;

    async execute(
        node: SqlTransformation,
        context: TransformationContext
    ): Promise<TransformationResult> {
        const { batch, parameters } = context;

        // シミュレーション: SQLは実行せず、パススルー
        // 実際のSQL実行はブラウザ環境では困難
        console.log(`[SQLStrategy] SQL Query (simulated): ${node.config.sqlQuery}`);
        console.log(`[SQLStrategy] Mode: ${node.config.mode}`);
        console.log(`[SQLStrategy] Parameters:`, parameters);

        return {
            output: batch,
            continue: true,
        };
    }

    validate(node: SqlTransformation): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!node.config?.sqlQuery) {
            errors.push('SQLクエリが指定されていません');
        }

        warnings.push('SQL変換はシミュレーション環境ではパススルーとして動作します');

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
}

export const sqlStrategy = new SQLStrategy();
