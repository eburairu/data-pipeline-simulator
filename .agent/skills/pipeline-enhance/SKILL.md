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
   - `src/lib/MappingTypes.ts` - 現在の変換タイプ定義（`TransformationType`を確認）
   - `src/lib/MappingEngine.ts` - ETL変換ロジック（traverse関数内のswitch文）
   - `src/components/settings/MappingDesigner.tsx` - UI（ツールバーボタン、設定パネル）

2. **現状分析**: `TransformationType`から現在実装済みのタイプ一覧を抽出し、ユーザーに報告

3. **実装対象の決定**:
   - ユーザー入力が空の場合: IDMC CDI参照リストから未実装候補を提示し、どれを実装するか確認
   - ユーザー入力に機能名がある場合: その機能を実装

4. **変換タイプ実装** (対象が決まった場合、以下の順序で実装):

   **Step 1: 型定義の追加** (`src/lib/MappingTypes.ts`):
   - `TransformationType` に新しいタイプを追加
   - 新しい `*Config` インターフェースを作成
   - `Transformation.config` の union 型に追加

   **Step 2: エンジンロジックの実装** (`src/lib/MappingEngine.ts`):
   - import に新しい Config 型を追加
   - `traverse` 関数内の switch 文に新しい case を追加
   - バッチ処理ロジックを実装
   - 処理結果を `processedBatch` に代入
   - console.log で処理状況を出力

   **Step 3: UIコンポーネントの追加** (`src/components/settings/MappingDesigner.tsx`):
   - import に新しい Config 型とアイコン (lucide-react) を追加
   - `addTransformation` 関数内にデフォルト設定を追加
   - ツールバーに新しいボタンを追加（適切なアイコンと色を選択）
   - `renderConfigPanel` 内に設定パネルを追加

5. **検証**:
   - `npm run build` を実行してTypeScriptコンパイルを確認
   - `npm test` を実行（存在する場合）
   - エラーがあれば修正

6. **完了報告**: 実装した機能と変更ファイルを報告

---

## IDMC CDI 変換タイプ参照リスト

以下はInformatica IDMC CDIに存在する代表的な変換タイプです。コンテキスト収集時に現在の`TransformationType`と比較して未実装のものを特定してください：

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

## 実装パターンテンプレート

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

---

## 色とアイコンの選択ガイド

**使用可能な色** (TailwindCSS):
- `green` - ソース系
- `red` - ターゲット系
- `yellow` - フィルター/条件系
- `purple` - 計算/変換系
- `orange` - 集計系
- `pink` - 検証系
- `blue` - 結合系
- `cyan` - 参照系
- `lime` - 分岐系
- `amber` - ソート系
- `indigo` - 統合系
- `violet` - 正規化系
- `rose` - ランキング系
- `sky` - 連番系
- `slate` - 戦略系
- `teal` - クレンジング系

**lucide-reactアイコン例**:
`Search`, `GitFork`, `ArrowUpDown`, `Merge`, `Repeat`, `Award`, `Hash`, `Flag`, `Sparkles`, `Filter`, `Database`, `Table`, `Columns`, `Rows`, `Copy`, `Trash2`, `Plus`, `CheckSquare`
