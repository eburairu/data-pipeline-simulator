/**
 * JoinerStrategy - 結合変換のStrategy実装
 * 
 * 2つのデータストリームを結合します（Inner, Left, Right, Full Outer）。
 */

import type { JoinerTransformation } from '../MappingTypes';
import type { DataRow } from '../types';
import type {
    TransformationStrategy,
    TransformationContext,
    TransformationResult,
    ValidationResult,
} from './types';

/**
 * 結合変換のStrategy
 */
export class JoinerStrategy implements TransformationStrategy<JoinerTransformation> {
    readonly type = 'joiner' as const;

    async execute(
        node: JoinerTransformation,
        context: TransformationContext
    ): Promise<TransformationResult> {
        const { batch, mapping, stats } = context;

        const joinerCacheKey = `joiner_${node.id}`;
        const incomingLinks = mapping.links.filter(l => l.targetId === node.id);

        // 単一入力の場合はそのまま返す
        if (incomingLinks.length < 2) {
            return { output: batch, continue: true };
        }

        // キャッシュを管理
        if (!stats.cache) stats.cache = {};

        if (!stats.cache[joinerCacheKey]) {
            // 最初のバッチを保存して待機
            stats.cache[joinerCacheKey] = { masterBatch: batch, received: 1 };
            return { output: [], continue: false }; // 処理を一時停止
        }

        // 2つ目のバッチが到着
        const cached = stats.cache[joinerCacheKey] as { masterBatch: DataRow[], received: number };
        const masterBatch = cached.masterBatch;
        const detailBatch = batch;
        const joinedRows: DataRow[] = [];
        const matchedDetailIndices = new Set<number>();

        // 結合処理
        for (const mRow of masterBatch) {
            let hasMatch = false;
            for (let dIdx = 0; dIdx < detailBatch.length; dIdx++) {
                const dRow = detailBatch[dIdx];
                const match = node.config.masterKeys.every((mKey, i) =>
                    String(mRow[mKey]) === String(dRow[node.config.detailKeys[i]])
                );

                if (match) {
                    hasMatch = true;
                    matchedDetailIndices.add(dIdx);
                    joinedRows.push({ ...mRow, ...dRow });
                }
            }

            // Left または Full Outer Join: マッチしなかったマスター行
            if (!hasMatch && (node.config.joinType === 'left' || node.config.joinType === 'full')) {
                joinedRows.push({ ...mRow });
            }
        }

        // Right または Full Outer Join: マッチしなかったディテール行
        if (node.config.joinType === 'right' || node.config.joinType === 'full') {
            for (let dIdx = 0; dIdx < detailBatch.length; dIdx++) {
                if (!matchedDetailIndices.has(dIdx)) {
                    joinedRows.push({ ...detailBatch[dIdx] });
                }
            }
        }

        // キャッシュをクリア
        delete stats.cache[joinerCacheKey];

        return {
            output: joinedRows,
            continue: true,
        };
    }

    validate(node: JoinerTransformation): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!node.config?.masterKeys || node.config.masterKeys.length === 0) {
            errors.push('マスターキーが指定されていません');
        }

        if (!node.config?.detailKeys || node.config.detailKeys.length === 0) {
            errors.push('ディテールキーが指定されていません');
        }

        if (node.config?.masterKeys?.length !== node.config?.detailKeys?.length) {
            errors.push('マスターキーとディテールキーの数が一致していません');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
}

export const joinerStrategy = new JoinerStrategy();
