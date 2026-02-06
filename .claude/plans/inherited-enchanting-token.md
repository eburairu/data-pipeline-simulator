# 012仕様 残タスク実装プラン

## Context

012仕様（UIコンポーネント分割）のT001-T028, T031-T035は完了済み。残りのT029-T030, T036-T051を実装する。
013仕様は全タスク完了済み。

## 残タスク概要

| グループ | タスク | 内容 |
|---------|--------|------|
| フェーズ3完了 | T029-T030 | MappingDesigner行数削減 (659→500以下) |
| フェーズ5 | T036-T041 | BiDashboardウィジェット分割 |
| フェーズ6 | T042-T046 | DatabaseSettings TableEditor分離 |
| フェーズ7 | T047-T051 | ポリッシュと検証 |

---

## バッチ1: 外部化ファイルの新規作成（並行実行可能）

### 1a. MappingDesigner用ヘルパー (T029準備)

**新規作成: `src/components/settings/mapping/constants.ts`**
- `TRANSFORMATION_TYPES` 配列を移動 (MappingDesigner行32-55)
- `createDefaultConfig(type)` ファクトリ関数を追加（行205-228のswitch文を置換）

**新規作成: `src/components/settings/mapping/DesignerNode.tsx`**
- `DesignerNode` コンポーネントを移動 (行58-78)
- `nodeTypes`, `edgeTypes` 定数を移動 (行80-86)

**新規作成: `src/components/settings/mapping/layoutHelper.ts`**
- `getLayoutedElements` 関数を移動 (行89-119)
- `applyDagreLayout` 関数を追加（onLayout内の重複ロジック統合用）

### 1b. メトリクスウィジェット (T036-T039)

**新規作成（各40-50行、並行可能）:**
- `src/components/widgets/RecordCountWidget.tsx` - レコード数表示
- `src/components/widgets/ThroughputWidget.tsx` - スループット表示
- `src/components/widgets/ErrorRateWidget.tsx` - エラー率表示
- `src/components/widgets/ProcessingTimeWidget.tsx` - 処理時間表示

各ウィジェットは `NumericWidgetProps` を使用し、`registerWidget` で登録。

### 1c. TableEditor (T042-T043)

**新規作成: `src/components/common/TableEditor.tsx`** (~120行)
- DatabaseSettings行82-165のテーブルカード部分を抽出
- Props: `table`, `onAddColumn`, `onRemoveColumn`, `onRemoveTable`, `columnInput`, `onColumnInputChange`
- T044: カラム数・型分布のスキーマ概要表示を追加

---

## バッチ2: 親コンポーネントの更新

### 2a. MappingDesigner更新 (T029-T030)

**修正: `src/components/settings/MappingDesigner.tsx`**
- constants.ts, DesignerNode.tsx, layoutHelper.ts からimport
- `TRANSFORMATION_TYPES`, `DesignerNode`, `nodeTypes`, `edgeTypes`, `getLayoutedElements` を削除
- `addTransformation` のswitch文を `createDefaultConfig` 呼び出しに置換
- `onLayout` の重複dagreロジックを `applyDagreLayout` 呼び出しに置換
- 目標: 659行 → ~495行 (約164行削減)

### 2b. BiDashboard分割 (T040-T041)

**新規作成:**
- `src/components/widgets/QueryFilterPanel.tsx` (~55行) - フィルタ管理UI
- `src/components/widgets/QueryTableView.tsx` (~40行) - テーブルビュー
- `src/components/widgets/QueryChartView.tsx` (~35行) - チャートビュー

**修正: `src/components/BiDashboard.tsx`**
- `DashboardWidget` を `QueryWidget` としてwidgets/に移動
- `QueryWidget` は上記サブコンポーネントを使用
- BiDashboard本体は ~30行に軽量化

### 2c. DatabaseSettings更新 (T045-T046)

**修正: `src/components/settings/DatabaseSettings.tsx`**
- テーブルカード部分をTableEditorコンポーネントに置換
- 削除確認モーダルはDatabaseSettingsに残す
- 目標: 243行 → ~160行

---

## バッチ3: ポリッシュと検証 (T047-T051)

- T047: 新規ファイルに日本語コメント追加
- T048: 型エラー解消（特にcreateDefaultConfigの型キャスト）
- T049: `npm test && npm run build` 最終検証
- T050: 動作確認
- T051: 各コンポーネント300行以下、MappingDesigner 500行以下を確認

---

## 新規作成ファイル一覧 (12ファイル)

```
src/components/settings/mapping/constants.ts      # 変換タイプ定数・ファクトリ関数
src/components/settings/mapping/DesignerNode.tsx   # デザイナーノード
src/components/settings/mapping/layoutHelper.ts    # dagreレイアウトヘルパー
src/components/widgets/RecordCountWidget.tsx        # レコード数ウィジェット
src/components/widgets/ThroughputWidget.tsx         # スループットウィジェット
src/components/widgets/ErrorRateWidget.tsx          # エラー率ウィジェット
src/components/widgets/ProcessingTimeWidget.tsx     # 処理時間ウィジェット
src/components/widgets/QueryWidget.tsx              # データクエリウィジェット(旧DashboardWidget)
src/components/widgets/QueryFilterPanel.tsx         # フィルタパネル
src/components/widgets/QueryTableView.tsx           # テーブルビュー
src/components/widgets/QueryChartView.tsx           # チャートビュー
src/components/common/TableEditor.tsx               # テーブルエディタ
```

## 修正ファイル一覧 (3ファイル)

```
src/components/settings/MappingDesigner.tsx        # 外部化モジュールのimport
src/components/BiDashboard.tsx                      # QueryWidgetへの切替
src/components/settings/DatabaseSettings.tsx        # TableEditorへの切替
```

## 検証

```bash
npm test && npm run build
```
