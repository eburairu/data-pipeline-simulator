/**
 * RouterStrategy - ルーティング変換のStrategy実装
 * 
 * 条件に基づいてデータを異なるグループに振り分けます。
 */

import type { RouterTransformation } from '../MappingTypes';
import type {
    TransformationStrategy,
    TransformationContext,
    TransformationResult,
    ValidationResult,
} from './types';
import { safeEvaluateExpression } from '../SafeExpressionEvaluator';

/**
 * ルーティング変換のStrategy
 */
export class RouterStrategy implements TransformationStrategy<RouterTransformation> {
    readonly type = 'router' as const;

    async execute(
        node: RouterTransformation,
        context: TransformationContext
    ): Promise<TransformationResult> {
        const { batch, parameters } = context;

        // 各グループの結果を初期化
        const routerOutput: Record<string, import('../types').DataRow[]> = {};
        node.config.routes.forEach(r => routerOutput[r.groupName] = []);
        routerOutput[node.config.defaultGroup] = [];

        // 各行を評価してルーティング
        for (const row of batch) {
            let routed = false;
            for (const route of node.config.routes) {
                if (safeEvaluateExpression(row, route.condition, parameters)) {
                    routerOutput[route.groupName].push(row);
                    routed = true;
                    break;
                }
            }
            if (!routed) {
                routerOutput[node.config.defaultGroup].push(row);
            }
        }

        return {
            output: batch, // Routerは元のバッチも返す
            continue: true,
            routerOutput,
        };
    }

    validate(node: RouterTransformation): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!node.config?.routes || node.config.routes.length === 0) {
            warnings.push('ルーティング条件が定義されていません。すべてのデータがデフォルトグループに振り分けられます');
        }

        if (!node.config?.defaultGroup) {
            errors.push('デフォルトグループが指定されていません');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
}

export const routerStrategy = new RouterStrategy();
