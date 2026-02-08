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
