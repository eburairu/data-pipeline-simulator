/**
 * WebServiceStrategy - Webサービス変換のStrategy実装
 * 
 * 外部APIを呼び出してデータを変換します（シミュレーション用）。
 */

import type { WebServiceTransformation } from '../MappingTypes';
import type {
    TransformationStrategy,
    TransformationContext,
    TransformationResult,
    ValidationResult,
} from './types';

/**
 * Webサービス変換のStrategy
 */
export class WebServiceStrategy implements TransformationStrategy<WebServiceTransformation> {
    readonly type = 'webService' as const;

    async execute(
        node: WebServiceTransformation,
        context: TransformationContext
    ): Promise<TransformationResult> {
        const { batch, parameters } = context;

        // モックレスポンスの処理
        if (node.config.mockResponse) {
            const output: any[] = [];

            // パラメータ置換 (全体)
            let baseResponse = node.config.mockResponse;
            if (parameters) {
                Object.entries(parameters).forEach(([k, v]) => {
                    // $$PARAM$$ (Informatica style)
                    baseResponse = baseResponse.replace(new RegExp(`\\$\\$${k}\\$\\$`, 'g'), String(v));
                    // ${PARAM} (Standard style)
                    baseResponse = baseResponse.replace(new RegExp(`\\$\\{${k}\\}`, 'g'), String(v));
                });
            }

            for (const row of batch) {
                let rowResponse = baseResponse;

                // 行データの置換: {fieldName}
                Object.entries(row).forEach(([k, v]) => {
                    if (v !== undefined && v !== null) {
                        rowResponse = rowResponse.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
                    }
                });

                try {
                    const parsed = JSON.parse(rowResponse);

                    if (Array.isArray(parsed)) {
                        // 配列の場合、各要素を展開して行と結合 (1:N)
                        parsed.forEach(item => {
                            if (typeof item === 'object' && item !== null) {
                                output.push({ ...row, ...item });
                            } else {
                                output.push({ ...row, response_value: item });
                            }
                        });
                    } else if (typeof parsed === 'object' && parsed !== null) {
                        // オブジェクトの場合、行と結合 (1:1)
                        output.push({ ...row, ...parsed });
                    } else {
                        // プリミティブの場合
                        output.push({ ...row, response_value: parsed });
                    }
                } catch (e) {
                    console.warn(`[WebServiceStrategy] Failed to parse JSON for row`, row, e);
                    // エラー時は元の行を出力し、エラー情報を付加
                    output.push({ ...row, error: 'JSON Parse Error' });
                }
            }

            return {
                output,
                continue: true
            };
        }

        // シミュレーション: 実際のAPI呼び出しは行わない
        console.log(`[WebServiceStrategy] URL (simulated): ${node.config.url}`);
        console.log(`[WebServiceStrategy] Method: ${node.config.method}`);
        console.log(`[WebServiceStrategy] Parameters:`, parameters);

        return {
            output: batch,
            continue: true,
        };
    }

    validate(node: WebServiceTransformation): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!node.config?.url) {
            errors.push('URLが指定されていません');
        }

        warnings.push('Webサービス変換はシミュレーション環境ではパススルーとして動作します');

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
}

export const webServiceStrategy = new WebServiceStrategy();
