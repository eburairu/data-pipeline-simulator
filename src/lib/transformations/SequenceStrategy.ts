/**
 * SequenceStrategy - シーケンス変換のStrategy実装
 * 
 * 連番を生成してフィールドに追加します。
 */

import type { SequenceTransformation } from '../MappingTypes';
import type {
    TransformationStrategy,
    TransformationContext,
    TransformationResult,
    ValidationResult,
} from './types';

/**
 * シーケンス変換のStrategy
 */
export class SequenceStrategy implements TransformationStrategy<SequenceTransformation> {
    readonly type = 'sequence' as const;

    async execute(
        node: SequenceTransformation,
        context: TransformationContext
    ): Promise<TransformationResult> {
        const { batch, state } = context;

        if (!state.sequences) state.sequences = {};
        let current = state.sequences[node.id] ?? node.config.startValue;

        const output = batch.map(row => {
            const newRow = { ...row, [node.config.sequenceField]: current };
            current += node.config.incrementBy;
            state.sequences![node.id] = current;
            return newRow;
        });

        return {
            output,
            continue: true,
        };
    }

    validate(node: SequenceTransformation): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!node.config?.sequenceField) {
            errors.push('シーケンスフィールド名が指定されていません');
        }

        if (node.config?.incrementBy === 0) {
            warnings.push('増分が0です。すべての行に同じ値が設定されます');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
}

export const sequenceStrategy = new SequenceStrategy();
