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

        // モック結果の処理
        if (node.config.mockResult) {
            let output: any[] = [];
            try {
                const parsed = JSON.parse(node.config.mockResult);

                if (batch.length > 0) {
                    // 入力がある場合: 各入力行に対してモック結果を結合 (1:N or 1:1)
                    for (const row of batch) {
                        if (Array.isArray(parsed)) {
                            // 配列の場合、各要素を展開して行と結合
                            parsed.forEach(item => {
                                if (typeof item === 'object' && item !== null) {
                                    output.push({ ...row, ...item });
                                } else {
                                    output.push({ ...row, result_value: item });
                                }
                            });
                        } else if (typeof parsed === 'object' && parsed !== null) {
                            // オブジェクトの場合、行と結合
                            output.push({ ...row, ...parsed });
                        } else {
                            // プリミティブの場合
                            output.push({ ...row, result_value: parsed });
                        }
                    }
                } else {
                    // 入力がない場合 (Sourceとして動作): モック結果をそのまま返す
                    if (Array.isArray(parsed)) {
                        output = parsed;
                    } else {
                        output = [parsed];
                    }
                }

                return { output, continue: true };

            } catch (e) {
                console.warn(`[SQLStrategy] Failed to parse mock result`, e);
                // パースエラー時はパススルー (ログ出力のみ)
            }
        }

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
