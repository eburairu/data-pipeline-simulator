/**
 * ValidatorStrategy - バリデーション変換のStrategy実装
 * 
 * データ行を検証ルールに基づいて検証します。
 */

import type { ValidatorTransformation } from '../MappingTypes';
import type { DataRow } from '../types';
import type {
    TransformationStrategy,
    TransformationContext,
    TransformationResult,
    ValidationResult,
} from './types';

/**
 * バリデーション変換のStrategy
 */
export class ValidatorStrategy implements TransformationStrategy<ValidatorTransformation> {
    readonly type = 'validator' as const;

    async execute(
        node: ValidatorTransformation,
        context: TransformationContext
    ): Promise<TransformationResult> {
        const { batch, stats, task } = context;
        const rules = node.config.rules || [];
        const validRows: DataRow[] = [];

        // Pre-compile regexes
        const compiledRules = rules.map(rule => {
            let regex: RegExp | undefined;
            if (rule.regex) {
                try {
                    regex = new RegExp(rule.regex);
                } catch (e) {
                    console.warn(`[ValidatorStrategy] Invalid regex: ${rule.regex}`, e);
                }
            }
            return { ...rule, compiledRegex: regex };
        });

        for (const row of batch) {
            let isValid = true;

            for (const rule of compiledRules) {
                const val = row[rule.field];

                // Required check
                if (rule.required && (val === undefined || val === null || val === '')) {
                    isValid = false;
                    break;
                }

                if (val !== undefined && val !== null && val !== '') {
                    // Type check
                    if (rule.type === 'number' && isNaN(Number(val))) {
                        isValid = false;
                        break;
                    }
                    if (rule.type === 'boolean') {
                        const s = String(val).toLowerCase();
                        if (s !== 'true' && s !== 'false' && s !== '1' && s !== '0') {
                            isValid = false;
                            break;
                        }
                    }

                    // Regex check
                    if (rule.compiledRegex) {
                        if (!rule.compiledRegex.test(String(val))) {
                            isValid = false;
                            break;
                        }
                    }
                }
            }

            if (isValid) {
                validRows.push(row);
            } else {
                if (node.config.errorBehavior === 'error') {
                    if (!stats.rejectRows) stats.rejectRows = [];
                    stats.rejectRows.push({
                        row: row,
                        error: `Validation failed: Rule validation error`,
                        transformationName: node.name
                    });
                    stats.transformations[node.id].errors++;

                    // Check stopOnErrors threshold
                    if (task.stopOnErrors && task.stopOnErrors > 0) {
                        const totalErrors = Object.values(stats.transformations).reduce((acc, t) => acc + t.errors, 0);
                        if (totalErrors > task.stopOnErrors) {
                            throw new Error(`Execution halted: Total errors (${totalErrors}) exceeded limit (${task.stopOnErrors}).`);
                        }
                    }
                }
            }
        }

        return {
            output: validRows,
            continue: true,
        };
    }

    validate(node: ValidatorTransformation): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!node.config?.rules || node.config.rules.length === 0) {
            warnings.push('バリデーションルールが定義されていません');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
}

export const validatorStrategy = new ValidatorStrategy();
