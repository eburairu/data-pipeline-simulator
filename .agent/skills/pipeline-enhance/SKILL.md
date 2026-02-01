---
name: pipeline-enhance
description: パイプライン全体に不足している機能や改善すべき機能がないか確認し、修正提案と実装を行うスキル
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **コンテキスト収集**: 以下のファイルを読み込んでパイプライン全体の現状を把握:
   - `src/lib/MappingTypes.ts` - 変換タイプ定義
   - `src/lib/MappingEngine.ts` - ETL変換ロジック
   - `src/components/settings/MappingDesigner.tsx` - マッピングUI
   - `src/lib/validation.ts` - バリデーションルール
   - `src/lib/VirtualFileSystem.tsx` - ファイルシステムシミュレーション
   - `src/lib/VirtualDB.tsx` - データベースシミュレーション

2. **現状分析 & 改善点特定**:
   - `TransformationType` と Data Integration参照リスト（後述）を比較し、未実装の変換を特定
   - バリデーションルールや型定義の不足を確認
   - 既存実装のリファクタリングや最適化の余地を検討
   - ユーザー入力がある場合は、その要求に対する現状とのギャップを特定

3. **提案と決定**:
   - 特定された改善点（未実装機能、バグ修正、リファクタリングなど）をリストアップ
   - 実装の優先順位と方針を提案し、ユーザーに進め方を確認（ユーザー入力で指定済みの場合は即決定）

4. **実装** (決定した内容に応じて以下のいずれかのパスを実行):

   ### Option A: 新しい変換タイプの実装
   (対象: 新しい `TransformationType` の追加)

   **Step 1: 型定義の追加** (`src/lib/MappingTypes.ts`):
   - `TransformationType` に新しいタイプを追加
   - 新しい `*Config` インターフェースを作成
   - `Transformation.config` の union 型に追加

   **Step 2: エンジンロジックの実装** (`src/lib/MappingEngine.ts`):
   - import に新しい Config 型を追加
   - `traverse` 関数内の switch 文に新しい case を追加
   - バッチ処理ロジックを実装し、`processedBatch` に結果を格納

   **Step 3: UIコンポーネントの追加** (`src/components/settings/MappingDesigner.tsx`):
   - import に新しい Config 型とアイコン (lucide-react) を追加
   - `addTransformation` 関数内にデフォルト設定を追加
   - ツールバーに新しいボタンを追加（適切なアイコンと色を選択）
   - `renderConfigPanel` 内に設定パネルを追加

   ### Option B: バリデーション/ルールの強化
   (対象: `src/lib/validation.ts` 等のロジック強化)
   - 新しいバリデーション関数を追加
   - 既存のロジックにエッジケース対応を追加

   ### Option C: その他の機能改善・修正
   - 対象ファイルの修正・機能追加を実行

5. **検証**:
   - `npm run build` を実行してTypeScriptコンパイルを確認
   - `npm test` を実行（存在する場合）
   - エラーがあれば修正

6. **完了報告**: 実装した機能と変更ファイルを報告

---

## Data Integration 変換タイプ参照リスト

以下は Data Integration に存在する代表的な変換タイプです。実装判断の参考にしてください：

| カテゴリ | 変換タイプ | 説明 |
|---------|-----------|------|
| **データ取得** | source | データソース読み込み |
| **データ出力** | target | データ書き込み |
| **フィルタリング** | filter | 条件でフィルタリング |
| **計算** | expression | 計算フィールド追加 |
| **集計** | aggregator | 集計（sum, count, avg等） |
| **検証** | validator | データ検証ルール適用 |
| **結合** | joiner | 2ソースの結合（Inner/Left/Right/Full） |
| **参照** | lookup | 参照テーブルからデータ取得 |
| **分岐** | router | 条件で行を振り分け |
| **ソート** | sorter | フィールドでソート |
| **統合** | union | 複数入力をマージ |
| **正規化** | normalizer | 配列を複数行に展開 |
| **ランキング** | rank | パーティション別ランキング付与 |
| **連番** | sequence | 連番生成 |
| **更新戦略** | updateStrategy | Insert/Update/Delete戦略設定 |
| **クレンジング** | cleansing | データクレンジング |
| **重複削除** | deduplicator | 重複行除去 |
| **ピボット** | pivot | 行→列変換 |
| **アンピボット** | unpivot | 列→行変換 |
| **SQL** | sql | SQLトランスフォーメーション |

---

## 実装パターンテンプレート (変換タイプ追加用)

### MappingTypes.ts
```typescript
// 1. TransformationType に追加
export type TransformationType = ... | 'newtype';

// 2. Config interface を作成
export interface NewTypeConfig extends TransformationConfig {
  // 設定フィールドを定義
  fieldName: string;
  options: string[];
}

// 3. Transformation.config に追加
config: ... | NewTypeConfig;
```

### MappingEngine.ts
```typescript
// import に追加
import { ..., type NewTypeConfig } from './MappingTypes';

// traverse 関数内の switch 文に追加
case 'newtype': {
  const conf = nextNode.config as NewTypeConfig;
  processedBatch = batch.map(row => {
    const newRow = { ...row };
    // 変換ロジック
    return newRow;
  });
  console.log(`[MappingEngine] NewType ${nextNode.name}: processed ${processedBatch.length} rows`);
  break;
}
```

### MappingDesigner.tsx
```tsx
// import に追加
import { ..., type NewTypeConfig } from '../../lib/MappingTypes';
import { ..., IconName } from 'lucide-react';

// addTransformation 内にデフォルト設定追加
if (type === 'newtype') newTrans.config = { fieldName: '', options: [] } as NewTypeConfig;

// ツールバーにボタン追加
<button title="Add NewType" onClick={() => addTransformation('newtype')} className="p-1 rounded hover:bg-gray-200">
  <div className="w-8 h-8 bg-COLOR-100 border-COLOR-500 border rounded flex items-center justify-center text-[10px]">
    <IconName size={12} />
  </div>
</button>

// renderConfigPanel 内に設定パネル追加
{node.type === 'newtype' && (
  <div className="space-y-3">
    <div>
      <label className="block text-xs text-gray-500">Field Name</label>
      <input
        className="w-full border rounded p-1 text-sm font-mono"
        value={(node.config as NewTypeConfig).fieldName || ''}
        onChange={e => updateTransformationConfig(node.id, { fieldName: e.target.value })}
      />
    </div>
  </div>
)}
```

## 色とアイコンの選択ガイド

**使用可能な色** (TailwindCSS):
`green` (Source), `red` (Target), `yellow` (Filter), `purple` (Expression), `orange` (Aggregator), `pink` (Validator), `blue` (Joiner), `cyan` (Lookup), `lime` (Router), `amber` (Sorter), `indigo` (Union), `violet` (Normalizer), `rose` (Rank), `sky` (Sequence), `slate` (Strategy), `teal` (Cleansing)

**lucide-reactアイコン例**:
`Search`, `GitFork`, `ArrowUpDown`, `Merge`, `Repeat`, `Award`, `Hash`, `Flag`, `Sparkles`, `Filter`, `Database`, `Table`, `Columns`, `Rows`, `Copy`, `Trash2`, `Plus`, `CheckSquare`
