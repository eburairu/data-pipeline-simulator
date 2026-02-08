/**
 * RankStrategy - ランク変換のStrategy実装
 * 
 * パーティション内でのランキングを計算します（ROW_NUMBER, RANK, DENSE_RANK）。
 */

import type { RankTransformation } from '../MappingTypes';
import type { DataRow } from '../types';
import type {
    TransformationStrategy,
    TransformationContext,
    TransformationResult,
    ValidationResult,
} from './types';

/**
 * ランク変換のStrategy
 */
export class RankStrategy implements TransformationStrategy<RankTransformation> {
    readonly type = 'rank' as const;

    async execute(
        node: RankTransformation,
        context: TransformationContext
    ): Promise<TransformationResult> {
        const { batch } = context;

        // パーティションごとにグループ化
        const groups: Record<string, DataRow[]> = {};
        for (const row of batch) {
            const key = node.config.partitionBy.map(p => String(row[p])).join('::');
            if (!groups[key]) groups[key] = [];
            groups[key].push(row);
        }

        const output: DataRow[] = [];

        for (const group of Object.values(groups)) {
            // ソート
            const sorted = [...group].sort((a, b) => {
                for (const o of node.config.orderBy) {
                    const valA = a[o.field];
                    const valB = b[o.field];
                    if (valA === valB) continue;
                    const dir = o.direction === 'asc' ? 1 : -1;
                    if (valA === undefined || valA === null) return 1 * dir;
                    if (valB === undefined || valB === null) return -1 * dir;
                    return valA > valB ? 1 * dir : -1 * dir;
                }
                return 0;
            });

            // ランク付け
            sorted.forEach((row, index) => {
                const newRow = { ...row };
                if (node.config.rankType === 'rowNumber') {
                    newRow[node.config.rankField] = index + 1;
                } else {
                    // 簡略化: rank/denseRank も row_number と同じ
                    newRow[node.config.rankField] = index + 1;
                }
                output.push(newRow);
            });
        }

        return {
            output,
            continue: true,
        };
    }

    validate(node: RankTransformation): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!node.config?.partitionBy || node.config.partitionBy.length === 0) {
            warnings.push('パーティションキーが指定されていません。全データを1パーティションとして扱います');
        }

        if (!node.config?.orderBy || node.config.orderBy.length === 0) {
            errors.push('ソート順が指定されていません');
        }

        if (!node.config?.rankField) {
            errors.push('ランクフィールド名が指定されていません');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
}

export const rankStrategy = new RankStrategy();
