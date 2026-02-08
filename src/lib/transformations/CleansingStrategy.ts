/**
 * CleansingStrategy - クレンジング変換のStrategy実装
 * 
 * データのクリーニング処理（trim, upper, lower, replace等）を実行します。
 */

import type { CleansingTransformation } from '../MappingTypes';
import type { DataValue } from '../types';
import type {
    TransformationStrategy,
    TransformationContext,
    TransformationResult,
    ValidationResult,
} from './types';

/**
 * クレンジング変換のStrategy
 */
export class CleansingStrategy implements TransformationStrategy<CleansingTransformation> {
    readonly type = 'cleansing' as const;

    async execute(
        node: CleansingTransformation,
        context: TransformationContext
    ): Promise<TransformationResult> {
        const { batch } = context;

        // 正規表現をプリコンパイル
        const compiledRules = node.config.rules.map(rule => {
            let regex: RegExp | undefined;
            if (rule.operation === 'replace' && rule.replacePattern) {
                try {
                    regex = new RegExp(rule.replacePattern, 'g');
                } catch (e) {
                    console.warn(`[CleansingStrategy] Invalid regex: ${rule.replacePattern}`, e);
                }
            }
            return { ...rule, regex };
        });

        const output = batch.map(row => {
            const newRow = { ...row };

            for (const rule of compiledRules) {
                let val = newRow[rule.field];

                switch (rule.operation) {
                    case 'trim':
                        if (typeof val === 'string') val = val.trim();
                        break;
                    case 'upper':
                        if (typeof val === 'string') val = val.toUpperCase();
                        break;
                    case 'lower':
                        if (typeof val === 'string') val = val.toLowerCase();
                        break;
                    case 'nullToDefault':
                        if (val === null || val === undefined) val = rule.defaultValue;
                        break;
                    case 'replace':
                        if (typeof val === 'string' && rule.regex) {
                            val = val.replace(rule.regex, rule.replaceWith || '');
                        }
                        break;
                }

                newRow[rule.field] = val as DataValue;
            }

            return newRow;
        });

        return {
            output,
            continue: true,
        };
    }

    validate(node: CleansingTransformation): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!node.config?.rules || node.config.rules.length === 0) {
            errors.push('クレンジングルールが定義されていません');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
}

export const cleansingStrategy = new CleansingStrategy();
