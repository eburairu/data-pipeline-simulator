/**
 * UnionStrategy - ユニオン変換のStrategy実装
 * 
 * 複数のデータストリームを結合します。
 */

import type { UnionTransformation } from '../MappingTypes';
import type { DataRow } from '../types';
import type {
    TransformationStrategy,
    TransformationContext,
    TransformationResult,
    ValidationResult,
} from './types';

/**
 * ユニオン変換のStrategy
 */
export class UnionStrategy implements TransformationStrategy<UnionTransformation> {
    readonly type = 'union' as const;

    async execute(
        node: UnionTransformation,
        context: TransformationContext
    ): Promise<TransformationResult> {
        const { batch, mapping, stats } = context;

        const unionCacheKey = `union_${node.id}`;
        const incomingLinks = mapping.links.filter(l => l.targetId === node.id);

        if (!stats.cache) stats.cache = {};

        if (!stats.cache[unionCacheKey]) {
            stats.cache[unionCacheKey] = { batches: [batch], received: 1 };
        } else {
            const cache = stats.cache[unionCacheKey] as { batches: DataRow[][]; received: number };
            cache.batches.push(batch);
            cache.received++;
        }

        const cache = stats.cache[unionCacheKey] as { batches: DataRow[][]; received: number };

        if (cache.received >= incomingLinks.length) {
            // すべてのブランチが到着
            const output = cache.batches.flat();
            delete stats.cache[unionCacheKey];
            return { output, continue: true };
        }

        // まだ待機中
        return { output: [], continue: false };
    }

    validate(_node: UnionTransformation): ValidationResult {
        return {
            valid: true,
            errors: [],
            warnings: [],
        };
    }
}

export const unionStrategy = new UnionStrategy();
