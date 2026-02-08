# Transformation Strategies

このディレクトリには、MappingEngineで使用される変換Strategyクラスが格納されています。

## 概要

Strategyパターンを採用し、各変換タイプを独立したクラスに分離しました：
- **保守性向上**: 各変換タイプが独立したファイルで管理
- **テスト容易性**: 個別のユニットテストが可能
- **拡張性**: 新しい変換タイプの追加が容易

## Strategy一覧（22種類）

### 基本変換
| Strategy | ファイル | 説明 |
|----------|----------|------|
| Filter | `FilterStrategy.ts` | 条件式でデータフィルタリング |
| Expression | `ExpressionStrategy.ts` | 式評価で新規フィールド追加 |
| Aggregator | `AggregatorStrategy.ts` | グループ化と集計計算 |
| Sorter | `SorterStrategy.ts` | データソート |
| Rank | `RankStrategy.ts` | ランク計算 |
| Sequence | `SequenceStrategy.ts` | シーケンス番号生成 |
| Validator | `ValidatorStrategy.ts` | バリデーションルール検証 |

### 結合変換
| Strategy | ファイル | 説明 |
|----------|----------|------|
| Joiner | `JoinerStrategy.ts` | 複数データソースの結合 |
| Lookup | `LookupStrategy.ts` | 参照テーブル検索 |
| Union | `UnionStrategy.ts` | 複数データソースの統合 |

### データ処理変換
| Strategy | ファイル | 説明 |
|----------|----------|------|
| Router | `RouterStrategy.ts` | 条件別にデータ振り分け |
| Normalizer | `NormalizerStrategy.ts` | 配列データの正規化 |
| Deduplicator | `DeduplicatorStrategy.ts` | 重複データ削除 |
| Pivot | `PivotStrategy.ts` | ピボット変換 |
| Unpivot | `UnpivotStrategy.ts` | アンピボット変換 |

### 高度な変換
| Strategy | ファイル | 説明 |
|----------|----------|------|
| SQL | `SQLStrategy.ts` | SQL実行（シミュレーション） |
| WebService | `WebServiceStrategy.ts` | WebService呼び出し（シミュレーション） |
| HierarchyParser | `HierarchyParserStrategy.ts` | 階層データのパース |
| Cleansing | `CleansingStrategy.ts` | データクレンジング |
| UpdateStrategy | `UpdateStrategyStrategy.ts` | Insert/Update/Delete戦略決定 |

### I/O変換
| Strategy | ファイル | 説明 |
|----------|----------|------|
| Source | `SourceStrategy.ts` | データソース読み込み |
| Target | `TargetStrategy.ts` | データ出力（圧縮対応） |

## 使い方

### 新しいStrategy追加

1. `XxxStrategy.ts` を作成
2. `TransformationStrategy` インターフェースを実装
3. `index.ts` でインポート・登録

```typescript
// XxxStrategy.ts
import type { TransformationStrategy } from './types';

export class XxxStrategy implements TransformationStrategy<XxxTransformation> {
    readonly type = 'xxx' as const;
    
    async execute(node, context): Promise<TransformationResult> {
        // 変換ロジック
        return { output: [...], continue: true };
    }
    
    validate(node): ValidationResult {
        // 設定検証
        return { valid: true, errors: [], warnings: [] };
    }
}

export const xxxStrategy = new XxxStrategy();
```

```typescript
// index.ts に追加
import { xxxStrategy } from './XxxStrategy';
registerStrategy(xxxStrategy);
```

## ファイル構成

```
transformations/
├── index.ts              # Strategy登録・取得メカニズム
├── index.test.ts         # 登録メカニズムのテスト
├── types.ts              # 型定義
├── README.md             # このファイル
└── *Strategy.ts          # 各変換Strategy実装
```
