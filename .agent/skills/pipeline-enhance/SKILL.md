---
name: pipeline-enhance
description: データパイプラインシミュレーターに新しい変換タイプを追加するための実装ワークフロー
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **コンテキスト収集**: 以下のファイルを読み込んで現状を把握:
   - `src/lib/MappingTypes.ts` - 現在の変換タイプ定義
   - `src/lib/MappingEngine.ts` - ETL変換ロジック（traverse関数内のswitch文）
   - `src/components/settings/MappingDesigner.tsx` - UI（ツールバーボタン、設定パネル）
   - `specs/spec.md` - 機能要件

2. **実装対象の決定**:
   - ユーザー入力が空の場合: 未実装の変換タイプ一覧を表示し、どれを実装するか確認
   - ユーザー入力に機能名がある場合: その機能を実装

3. **変換タイプ実装** (対象が決まった場合、以下の順序で実装):

   **Step 1: 型定義の追加** (`src/lib/MappingTypes.ts`):
   - `TransformationType` に新しいタイプを追加
   - 新しい `*Config` インターフェースを作成
   - `Transformation.config` の union 型に追加

   **Step 2: エンジンロジックの実装** (`src/lib/MappingEngine.ts`):
   - import に新しい Config 型を追加
   - `traverse` 関数内の switch 文に新しい case を追加
   - バッチ処理ロジックを実装
   - 処理結果を `processedBatch` に代入

   **Step 3: UIコンポーネントの追加** (`src/components/settings/MappingDesigner.tsx`):
   - import に新しい Config 型とアイコンを追加
   - `addTransformation` 関数内にデフォルト設定を追加
   - ツールバーに新しいボタンを追加（適切なアイコンと色を選択）
   - `renderConfigPanel` 内に設定パネルを追加

4. **検証**:
   - `npm run build` を実行してTypeScriptコンパイルを確認
   - エラーがあれば修正

5. **完了報告**: 実装した機能と変更ファイルを報告

## 未実装の変換タイプ参照

IDMC CDI に存在し、実装候補となる変換タイプ:

| 変換 | 説明 | 難易度 |
|------|------|--------|
| Normalizer | 1行を複数行に展開（配列フィールドの正規化） | 中 |
| Rank | ウィンドウ関数的なランキング | 中 |
| Sequence | 連番生成 | 低 |
| UpdateStrategy | Insert/Update/Deleteフラグ設定 | 中 |
| Data Cleansing | NULL置換、トリム、フォーマット変換 | 中 |
| Data Profiling | カラム統計情報収集 | 中 |

## 実装パターン例

新しい変換タイプを追加する場合のコードパターン:

**MappingTypes.ts:**
```typescript
// 1. TransformationType に追加
export type TransformationType = ... | 'newtype';

// 2. Config interface を作成
export interface NewTypeConfig extends TransformationConfig {
  // 設定フィールド
}

// 3. Transformation.config に追加
config: ... | NewTypeConfig;
```

**MappingEngine.ts:**
```typescript
// traverse 関数内
case 'newtype': {
  const conf = nextNode.config as NewTypeConfig;
  processedBatch = batch.map(row => {
    // 変換ロジック
    return transformedRow;
  });
  console.log(`[MappingEngine] NewType ${nextNode.name}: processed ${processedBatch.length} rows`);
  break;
}
```

**MappingDesigner.tsx:**
```tsx
// addTransformation 内
if (type === 'newtype') newTrans.config = { /* defaults */ } as NewTypeConfig;

// ツールバー
<button title="Add NewType" onClick={() => addTransformation('newtype')} ...>

// renderConfigPanel 内
{node.type === 'newtype' && (
  <div className="space-y-3">
    {/* 設定UI */}
  </div>
)}
```
