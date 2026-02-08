/**
 * Transformation Strategy 登録とファクトリー
 * 
 * このモジュールは、変換Strategyの登録・取得メカニズムを提供します。
 * 新しい変換タイプを追加する場合は、Strategyクラスを作成して
 * registerStrategy()で登録してください。
 */

import type { Transformation } from '../MappingTypes';
import type { TransformationStrategy } from './types';

/**
 * 登録されたStrategyのマップ
 */
const strategyRegistry = new Map<string, TransformationStrategy>();

/**
 * Strategyを登録します
 * @param strategy 登録するStrategy
 */
export function registerStrategy<T extends Transformation>(
    strategy: TransformationStrategy<T>
): void {
    if (strategyRegistry.has(strategy.type)) {
        console.warn(`Strategy for type "${strategy.type}" is already registered. Overwriting.`);
    }
    strategyRegistry.set(strategy.type, strategy as TransformationStrategy);
}

/**
 * 指定された変換タイプのStrategyを取得します
 * @param type 変換タイプ名
 * @returns 対応するStrategy、見つからない場合はundefined
 */
export function getStrategy(type: string): TransformationStrategy | undefined {
    return strategyRegistry.get(type);
}

/**
 * 登録されているすべてのStrategyタイプを取得します
 * @returns 登録されているタイプ名の配列
 */
export function getRegisteredTypes(): string[] {
    return Array.from(strategyRegistry.keys());
}

/**
 * Strategyが登録されているかどうかを確認します
 * @param type 変換タイプ名
 * @returns 登録されている場合はtrue
 */
export function hasStrategy(type: string): boolean {
    return strategyRegistry.has(type);
}

/**
 * すべてのStrategyをクリアします（主にテスト用）
 */
export function clearRegistry(): void {
    strategyRegistry.clear();
}

/**
 * 登録されているStrategyの数を取得します
 * @returns Strategyの数
 */
export function getStrategyCount(): number {
    return strategyRegistry.size;
}

// 型定義のエクスポート
export type {
    TransformationStrategy,
    TransformationContext,
    TransformationResult,
    ValidationResult,
    ExecutionStats,
    ExecutionState,
    FileSystemOps,
    DbOps,
    DbRecord,
    ExpressionEvaluator,
} from './types';

// ===========================================
// すべてのStrategyをインポートして自動登録
// ===========================================

import { filterStrategy } from './FilterStrategy';
import { expressionStrategy } from './ExpressionStrategy';
import { aggregatorStrategy } from './AggregatorStrategy';
import { sorterStrategy } from './SorterStrategy';
import { rankStrategy } from './RankStrategy';
import { sequenceStrategy } from './SequenceStrategy';
import { joinerStrategy } from './JoinerStrategy';
import { lookupStrategy } from './LookupStrategy';
import { unionStrategy } from './UnionStrategy';
import { routerStrategy } from './RouterStrategy';
import { normalizerStrategy } from './NormalizerStrategy';
import { deduplicatorStrategy } from './DeduplicatorStrategy';
import { pivotStrategy } from './PivotStrategy';
import { unpivotStrategy } from './UnpivotStrategy';
import { sqlStrategy } from './SQLStrategy';
import { webServiceStrategy } from './WebServiceStrategy';
import { hierarchyParserStrategy } from './HierarchyParserStrategy';
import { cleansingStrategy } from './CleansingStrategy';
import { updateStrategyStrategy } from './UpdateStrategyStrategy';
import { sourceStrategy } from './SourceStrategy';
import { targetStrategy } from './TargetStrategy';
import { validatorStrategy } from './ValidatorStrategy';

/**
 * すべてのStrategyを登録
 */
function initializeStrategies(): void {
    // 基本変換
    registerStrategy(filterStrategy);
    registerStrategy(expressionStrategy);
    registerStrategy(aggregatorStrategy);
    registerStrategy(sorterStrategy);
    registerStrategy(rankStrategy);
    registerStrategy(sequenceStrategy);
    registerStrategy(validatorStrategy);

    // 結合変換
    registerStrategy(joinerStrategy);
    registerStrategy(lookupStrategy);
    registerStrategy(unionStrategy);

    // データ処理変換
    registerStrategy(routerStrategy);
    registerStrategy(normalizerStrategy);
    registerStrategy(deduplicatorStrategy);
    registerStrategy(pivotStrategy);
    registerStrategy(unpivotStrategy);

    // 高度な変換
    registerStrategy(sqlStrategy);
    registerStrategy(webServiceStrategy);
    registerStrategy(hierarchyParserStrategy);
    registerStrategy(cleansingStrategy);
    registerStrategy(updateStrategyStrategy);

    // ソース/ターゲット
    registerStrategy(sourceStrategy);
    registerStrategy(targetStrategy);
}

// モジュールロード時に自動登録
initializeStrategies();
