---
name: pipeline-enhance
description: データパイプラインシミュレーターを本物のIDMC CDIに近づけるための機能調査・実装ワークフロー
---

# Pipeline Enhancement Skill

データパイプラインシミュレーターを本物の Informatica IDMC CDI に近づけるための不足機能を調査し、実装するためのスキルです。

## 使用方法

このスキルは以下のコマンドで呼び出せます:
- `/pipeline-enhance` - 機能調査と実装の開始
- `/pipeline-enhance analyze` - 現状分析のみ実行
- `/pipeline-enhance implement <feature>` - 特定機能の実装

---

## Phase 1: 現状分析

### 1.1 現在実装済みの機能を確認

1. **ファイルを確認**:
   - `src/lib/MappingTypes.ts` - 現在の変換タイプ定義
   - `src/lib/MappingEngine.ts` - ETL変換ロジック
   - `src/lib/SettingsContext.tsx` - 設定とジョブ定義
   - `specs/spec.md` - 機能要件

2. **現在サポートしている機能**:
   - 変換タイプ: `source`, `target`, `filter`, `expression`, `aggregator`
   - ジョブ: データ生成、収集(Collection)、配信(Delivery)、マッピング
   - データストア: 仮想ファイルシステム、仮想データベース
   - Expression: 計算フィールド、条件フィルター

### 1.2 IDMC CDI との機能比較

以下の観点で現在の実装を評価:

| カテゴリ | IDMC CDI 機能 | 現在の状態 | 優先度 |
|---------|--------------|-----------|--------|
| **変換** | Joiner | ❌ 未実装 | 高 |
| **変換** | Lookup | ❌ 未実装 | 高 |
| **変換** | Sorter | ❌ 未実装 | 中 |
| **変換** | Router | ❌ 未実装 | 中 |
| **変換** | Normalizer | ❌ 未実装 | 低 |
| **変換** | Union | ❌ 未実装 | 中 |
| **変換** | Rank | ❌ 未実装 | 低 |
| **データ品質** | プロファイリング | ❌ 未実装 | 中 |
| **データ品質** | クレンジング | ❌ 未実装 | 低 |
| **エラー処理** | エラー行ログ | ❌ 未実装 | 高 |
| **エラー処理** | リトライ機構 | ❌ 未実装 | 中 |
| **監視** | データリネージュ | ❌ 未実装 | 高 |
| **監視** | 実行ログ詳細化 | ⚠️ 部分的 | 中 |
| **CDC** | 差分取り込み | ❌ 未実装 | 高 |
| **タスク** | タスクフロー | ❌ 未実装 | 高 |
| **タスク** | スケジュール | ⚠️ インターバルのみ | 中 |
| **接続** | API接続 | ❌ 未実装 | 中 |
| **接続** | データベース種別 | ⚠️ 1種類のみ | 低 |

---

## Phase 2: 機能選定

### 優先度の決定基準

1. **教育的価値**: シミュレーターの学習目的に貢献するか
2. **実装難易度**: 現在のアーキテクチャで実装可能か
3. **視覚的効果**: パイプラインの可視化に役立つか
4. **IDMC類似性**: 本物のCDIに近い体験を提供するか

### 推奨実装順序

#### Tier 1 (必須 - 高優先度)

1. **Joiner 変換**
   - 2つのソースからのデータ結合
   - Inner/Left/Right/Full Outer Join サポート
   - 結合キー設定

2. **Lookup 変換**
   - 参照テーブルからのデータ参照
   - キャッシュオプション
   - 一致なし時のデフォルト値

3. **データリネージュ**
   - ソースからターゲットまでのデータフロー追跡
   - フィールドレベルのマッピング可視化
   - 変換履歴の記録

4. **エラー行ログ**
   - 変換失敗行の記録
   - エラー原因の詳細表示
   - エラーファイル出力

#### Tier 2 (重要 - 中優先度)

5. **Router 変換**
   - 条件分岐による行のルーティング
   - 複数出力先への分配
   - デフォルトグループ

6. **Sorter 変換**
   - 指定フィールドでのソート
   - 昇順/降順対応
   - 複数キーソート

7. **Union 変換**
   - 複数ソースのマージ
   - スキーマ互換性チェック

8. **タスクフロー**
   - 複数タスクの順次/並列実行
   - 依存関係の定義
   - 条件分岐

#### Tier 3 (拡張 - 低優先度)

9. **差分取り込み (CDC)**
   - タイムスタンプベースの増分
   - 変更検出ロジック

10. **データプロファイリング**
    - カラム統計情報
    - NULL率、ユニーク値数

---

## Phase 3: 実装ガイド

### 3.1 新しい変換タイプの追加手順

1. **型定義の追加** (`src/lib/MappingTypes.ts`):
   ```typescript
   // TransformationType に追加
   export type TransformationType = 'source' | 'target' | 'filter' | 'expression' | 'aggregator' | 'joiner';

   // 設定インターフェースを追加
   export interface JoinerConfig extends TransformationConfig {
     masterSource: string;
     detailSource: string;
     joinType: 'inner' | 'left' | 'right' | 'full';
     joinCondition: { masterKey: string; detailKey: string }[];
   }
   ```

2. **変換ロジックの実装** (`src/lib/MappingEngine.ts`):
   - `traverse` 関数内に新しい case を追加
   - バッチ処理ロジックを実装

3. **UIコンポーネントの作成** (`src/components/settings/`):
   - 設定パネルコンポーネント
   - ReactFlow ノードタイプ

4. **マッピングデザイナーの更新** (`src/components/settings/MappingDesigner.tsx`):
   - ノードタイプ選択に追加
   - エッジ接続ルールの更新

### 3.2 テスト方針

- 新機能追加時は `*.test.ts` ファイルを作成
- 既存テストパターンに従う: `src/lib/*.test.ts`
- ブラウザでの動作確認: パイプラインを実行して確認

---

## Phase 4: 検証

### 各機能の検証チェックリスト

- [ ] TypeScript コンパイルエラーなし
- [ ] ESLint 警告なし
- [ ] ユニットテストパス
- [ ] ブラウザでパイプライン動作確認
- [ ] 設定パネルで設定可能
- [ ] ビジュアライザで表示される
- [ ] コンソールログに処理状況表示

---

## 参考リソース

- [Informatica IDMC Documentation](https://docs.informatica.com/)
- [specs/spec.md](file:///specs/spec.md) - プロジェクト機能要件
- [specs/constitution.md](file:///specs/constitution.md) - プロジェクト原則

---

## 使用例

### 例1: Joiner変換の実装を開始

```
/pipeline-enhance implement joiner
```

エージェントは以下を実行:
1. `MappingTypes.ts` に JoinerConfig を追加
2. `MappingEngine.ts` に結合ロジックを実装
3. 設定パネルコンポーネントを作成
4. テストを作成・実行

### 例2: 現状分析のみ

```
/pipeline-enhance analyze
```

エージェントは現在の実装と IDMC CDI を比較し、不足機能のレポートを生成。
