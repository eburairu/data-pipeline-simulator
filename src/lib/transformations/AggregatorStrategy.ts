/**
 * AggregatorStrategy - 集計変換のStrategy実装
 * 
 * グループ化とSUM, COUNT, AVG, MIN, MAXなどの集計を実行します。
 */

import type { AggregatorTransformation } from '../MappingTypes';
import type { DataRow } from '../types';
import type {
    TransformationStrategy,
    TransformationContext,
    TransformationResult,
    ValidationResult,
} from './types';

/**
 * 集計変換のStrategy
 */
export class AggregatorStrategy implements TransformationStrategy<AggregatorTransformation> {
    readonly type = 'aggregator' as const;

    async execute(
        node: AggregatorTransformation,
        context: TransformationContext
    ): Promise<TransformationResult> {
        const { batch } = context;

        // グループ化
        const groups: Record<string, DataRow[]> = {};
        for (const row of batch) {
            const key = node.config.groupBy.map(g => String(row[g])).join('::');
            if (!groups[key]) groups[key] = [];
            groups[key].push(row);
        }

        // 集計
        const output = Object.entries(groups).map(([key, rows]) => {
            const result: DataRow = {};

            // グループキーを復元
            node.config.groupBy.forEach((g, i) => {
                result[g] = key.split('::')[i];
            });

            // 集計関数を適用
            for (const agg of node.config.aggregates) {
                const values = rows.map(r => Number(r[agg.field]) || 0);

                switch (agg.function) {
                    case 'sum':
                        result[agg.name] = values.reduce((a, b) => a + b, 0);
                        break;
                    case 'count':
                        result[agg.name] = values.length;
                        break;
                    case 'avg':
                        result[agg.name] = values.length > 0
                            ? values.reduce((a, b) => a + b, 0) / values.length
                            : 0;
                        break;
                    case 'max':
                        result[agg.name] = Math.max(...values);
                        break;
                    case 'min':
                        result[agg.name] = Math.min(...values);
                        break;
                }
            }

            return result;
        });

        return {
            output,
            continue: true,
        };
    }

    validate(node: AggregatorTransformation): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!node.config?.groupBy || node.config.groupBy.length === 0) {
            errors.push('グループ化キーが指定されていません');
        }

        if (!node.config?.aggregates || node.config.aggregates.length === 0) {
            errors.push('集計関数が定義されていません');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
}

export const aggregatorStrategy = new AggregatorStrategy();
