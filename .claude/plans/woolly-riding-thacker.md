# SDD仕様書（010〜013）実行計画

## 現状分析サマリー

| 仕様 | ファイル | 現行数 | 問題 | 優先度 |
|------|---------|--------|------|--------|
| 010 | MappingEngine.ts | 1,062行 | `new Function()`セキュリティリスク | 高 |
| 011 | PipelineFlow.tsx / JobMonitor.tsx | 687行 / 600行 | 毎秒再レンダリング | 高 |
| 012 | MappingDesigner.tsx | **2,407行** | 巨大モノリス | 高 |
| 013 | ExpressionFunctions.ts | 239行 | 16箇所の`any`型 | 中 |

## 推奨実行順序

### フェーズ1: 011-performance-optimization（即効性が高い）
**理由**: 比較的小規模な変更でユーザー体験を改善できる

#### 実行タスク
1. `src/components/common/ElapsedTimeDisplay.tsx` を作成
2. JobMonitor.tsx の時間表示を分離（毎秒再レンダリング問題の解消）
3. `src/lib/hooks/usePipelineLayout.ts` を作成
4. PipelineFlow.tsx のレイアウト計算をメモ化

**検証**: `npm test && npm run build`

---

### フェーズ2: 012-ui-component-decomposition（US1のみ）
**理由**: MappingDesigner.tsx（2,407行）は最大のモノリス

#### 実行タスク
1. `src/components/settings/mapping/` ディレクトリ作成
2. `TransformationConfigProps` インターフェース定義
3. 各変換タイプの設定パネルを分離（21ファイル）
4. MappingDesigner.tsx を500行以下に軽量化

**検証**: `npm test && npm run build` + UIで各設定パネルの動作確認

---

### フェーズ3: 013-type-safety-improvements（US1のみ）
**理由**: ExpressionFunctions.tsの`any`型排除は限定的な変更

#### 実行タスク
1. ExpressionFunctions.tsの関数をジェネリクス化
2. `unknown`型への置き換え
3. 既存テストの維持確認

**検証**: `npm test && npm run build`

---

### フェーズ4: 010-mapping-engine-refactoring（大規模リファクタリング）
**理由**: 最も複雑で影響範囲が広い。他のフェーズ完了後に着手

#### 実行タスク
1. `src/lib/transformations/` ディレクトリ作成
2. TransformationStrategy インターフェース定義
3. SafeExpressionEvaluator 実装（`new Function()`の排除）
4. 各変換Strategyの実装（21クラス）
5. MappingEngine.ts の軽量化

**検証**: `npm test && npm run build` + 全変換タイプの動作確認

---

## 本セッションで実行する範囲

トークン消費を考慮し、**フェーズ1（011-performance-optimization）** を完了する。

### 具体的なタスク

1. **ElapsedTimeDisplay.tsx 作成**
   - `src/components/common/ElapsedTimeDisplay.tsx`
   - React.memo + 独自のsetInterval

2. **JobMonitor.tsx 最適化**
   - ElapsedTimeDisplay使用に置き換え
   - 親コンポーネントの毎秒更新を削除

3. **usePipelineLayout.ts 作成**
   - `src/lib/hooks/usePipelineLayout.ts`
   - dagreレイアウト計算のメモ化

4. **PipelineFlow.tsx 最適化**
   - usePipelineLayout使用に置き換え
   - 依存配列の最適化

### 対象ファイル
- `src/components/common/ElapsedTimeDisplay.tsx` (新規)
- `src/components/JobMonitor.tsx` (修正)
- `src/lib/hooks/usePipelineLayout.ts` (新規)
- `src/components/PipelineFlow.tsx` (修正)

### 検証手順
```bash
npm test && npm run build
npm run dev  # 手動でJobMonitor、PipelineFlowの動作確認
```
