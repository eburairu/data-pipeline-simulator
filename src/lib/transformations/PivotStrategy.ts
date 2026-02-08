/**
 * PivotStrategy - ピボット変換のStrategy実装
 * 
 * 行を列に変換します（横持ち変換）。
 */

import type { PivotTransformation } from '../MappingTypes';
import type { DataRow } from '../types';
import type {
    TransformationStrategy,
    TransformationContext,
    TransformationResult,
    ValidationResult,
} from './types';

/**
 * ピボット変換のStrategy
 */
export class PivotStrategy implements TransformationStrategy<PivotTransformation> {
    readonly type = 'pivot' as const;

    async execute(
        node: PivotTransformation,
        context: TransformationContext
    ): Promise<TransformationResult> {
        const { batch } = context;

        const groups: Record<string, DataRow> = {};

        for (const row of batch) {
            const groupKey = node.config.groupByFields.map(f => String(row[f])).join('::');

            if (!groups[groupKey]) {
                const newRow: DataRow = {};
                node.config.groupByFields.forEach(f => newRow[f] = row[f]);
                groups[groupKey] = newRow;
            }

            const pivotVal = String(row[node.config.pivotField]);
            groups[groupKey][pivotVal] = row[node.config.valueField];
        }

        return {
            output: Object.values(groups),
            continue: true,
        };
    }

    validate(node: PivotTransformation): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!node.config?.groupByFields || node.config.groupByFields.length === 0) {
            errors.push('グループ化フィールドが指定されていません');
        }

        if (!node.config?.pivotField) {
            errors.push('ピボットフィールドが指定されていません');
        }

        if (!node.config?.valueField) {
            errors.push('値フィールドが指定されていません');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
}

export const pivotStrategy = new PivotStrategy();
