# 機能仕様書: 型安全性・コード品質改善

**機能ブランチ**: `013-type-safety-improvements`
**作成日**: 2026-02-05
**ステータス**: 実装中 (In Progress)
**入力**: Gemini CLIによるコードベース分析結果

## 背景

コードベース分析により、以下の型安全性・コード品質の問題が特定された:

1. **ExpressionFunctions.ts**: `any`型の多用（IIF, CONCAT等の関数）
2. **SettingsContext.tsx**: God Object化、機能ごとの分割が必要
3. **BiDashboard.tsx**: 型定義が不十分
4. **定数管理**: マジックナンバー、ハードコードされた文字列が散在
5. **アクセシビリティ**: キーボード操作、フォームラベルの紐付けが不十分

## ユーザーシナリオとテスト

### ユーザーストーリー 1 - ExpressionFunctions型安全性向上 (優先度: P1)

開発者として、ExpressionFunctions.tsの関数がジェネリクスを使用し、型安全であることで、式評価時のランタイムエラーを減らしたい。

**この優先度の理由**: 型安全性はプロジェクト憲章の原則であり、`any`型の排除は必須。

**独立テスト**: TypeScriptコンパイル時に型エラーが検出され、ランタイムエラーが減少する。

**受け入れシナリオ**:

1. **前提条件** 更新後のExpressionFunctions, **操作** IIF<T>を呼び出す, **期待結果** 戻り値の型がTとして推論される
2. **前提条件** 更新後のExpressionFunctions, **操作** 型が一致しない引数を渡す, **期待結果** TypeScriptエラーが発生
3. **前提条件** MappingEngine使用中, **操作** 式を評価, **期待結果** 従来通り動作する

---

### ユーザーストーリー 2 - SettingsContext分割 (優先度: P1)

開発者として、SettingsContextが機能ごとに分割されていることで、特定の設定変更が関係ないコンポーネントの再レンダリングを引き起こさないようにしたい。

**この優先度の理由**: God Objectの解消はアーキテクチャ改善の基本。パフォーマンスにも影響。

**独立テスト**: 特定の設定変更が、その設定を使用するコンポーネントのみを再レンダリングすることをReact DevToolsで確認。

**受け入れシナリオ**:

1. **前提条件** 分割後のContext構造, **操作** データソース設定を変更, **期待結果** パイプライン表示は再レンダリングされない
2. **前提条件** 分割後のContext構造, **操作** 接続設定を変更, **期待結果** 接続関連コンポーネントのみ再レンダリング
3. **前提条件** すべての設定画面, **操作** 各設定を編集, **期待結果** 従来通り設定が保存・反映される

---

### ユーザーストーリー 3 - 定数管理の集約 (優先度: P2)

開発者として、マジックナンバーや繰り返し使用される文字列が定数ファイルに集約されていることで、変更時の影響範囲を容易に把握できるようにしたい。

**この優先度の理由**: 保守性向上に貢献するが、機能的には影響しない。

**独立テスト**: 定数を変更した場合、関連するすべての箇所に反映されることを確認。

**受け入れシナリオ**:

1. **前提条件** 定数ファイル, **操作** デフォルトのシミュレーション間隔を変更, **期待結果** 全体に反映される
2. **前提条件** コードベース, **操作** マジックナンバーを検索, **期待結果** 定数ファイルへの参照のみ

---

### ユーザーストーリー 4 - アクセシビリティ改善 (優先度: P3)

ユーザーとして、キーボードのみでアプリケーションを操作でき、スクリーンリーダーでも使用できるようにしたい。

**この優先度の理由**: 重要だが、大規模な変更が必要なため優先度を下げる。

**独立テスト**: Tabキーですべてのインタラクティブ要素にフォーカスでき、Enterキーでアクションを実行できる。

**受け入れシナリオ**:

1. **前提条件** アプリケーション起動, **操作** Tabキーで移動, **期待結果** すべてのボタン、リンク、入力にフォーカス可能
2. **前提条件** フォーム入力, **操作** ラベルをクリック, **期待結果** 対応する入力フィールドにフォーカス
3. **前提条件** スクリーンリーダー使用, **操作** ページを読み上げ, **期待結果** 意味のある情報が読み上げられる

---

### エッジケース

- ジェネリクス導入後のMappingEngine動的評価との互換性
- Context分割後の複数Context間の状態同期
- 定数変更時のテストへの影響

## 要件

### 機能要件

- **FR-001**: ExpressionFunctions.tsの関数は `any` の代わりにジェネリクスまたは `unknown` を使用しなければならない
- **FR-002**: SettingsContextは以下のContextに分割されなければならない:
  - PipelineContext（パイプライン設定）
  - ConnectionContext（接続設定）
  - DataSourceContext（データソース設定）
  - SimulationContext（シミュレーション設定）
- **FR-003**: 共通定数は `src/lib/constants.ts` に集約されなければならない
- **FR-004**: すべてのインタラクティブ要素はキーボードでアクセス可能でなければならない
- **FR-005**: フォーム入力には適切なlabel要素が紐付けられなければならない
- **FR-006**: BiDashboard.tsxのデータ型は明示的に定義されなければならない

### 主要エンティティ

- **PipelineContextValue**: パイプライン設定の状態と更新関数
- **ConnectionContextValue**: 接続設定の状態と更新関数
- **DataSourceContextValue**: データソース設定の状態と更新関数
- **SimulationContextValue**: シミュレーション設定の状態と更新関数
- **AppConstants**: アプリケーション全体で使用される定数

## 成功基準

### 測定可能なアウトカム

- **SC-001**: ExpressionFunctions.tsから `any` 型の使用が排除される
- **SC-002**: SettingsContext.tsxが4つ以上の専門Contextに分割される
- **SC-003**: コードベース内のマジックナンバーが80%以上定数化される
- **SC-004**: 主要なフォーム入力の100%にlabel要素が紐付けられる
- **SC-005**: npm test && npm run build がすべてパスする
- **SC-006**: TypeScript strict mode でエラーがない

## 技術的考慮事項

### ExpressionFunctions型改善

```typescript
// Before
function IIF(condition: any, trueVal: any, falseVal: any): any

// After
function IIF<T>(condition: boolean, trueVal: T, falseVal: T): T
function CONCAT(...args: unknown[]): string
function TO_NUMBER(value: unknown): number
```

### SettingsContext分割パターン

```typescript
// src/lib/context/PipelineContext.tsx
const PipelineContext = createContext<PipelineContextValue | null>(null);
export const usePipeline = () => useContext(PipelineContext);

// src/lib/context/ConnectionContext.tsx
const ConnectionContext = createContext<ConnectionContextValue | null>(null);
export const useConnection = () => useContext(ConnectionContext);

// src/lib/SettingsProvider.tsx (複合プロバイダー)
export const SettingsProvider: React.FC<PropsWithChildren> = ({ children }) => (
  <PipelineProvider>
    <ConnectionProvider>
      <DataSourceProvider>
        <SimulationProvider>
          {children}
        </SimulationProvider>
      </DataSourceProvider>
    </ConnectionProvider>
  </PipelineProvider>
);
```

### 定数ファイル構造

```typescript
// src/lib/constants.ts
export const SIMULATION = {
  DEFAULT_INTERVAL_MS: 1000,
  MAX_RECORDS_PER_BATCH: 100,
  MAX_CONCURRENT_JOBS: 10,
} as const;

export const UI = {
  MAX_LOG_ENTRIES: 1000,
  DEBOUNCE_MS: 300,
  ANIMATION_DURATION_MS: 200,
} as const;

export const STORAGE = {
  LOCAL_STORAGE_KEY: 'data-pipeline-simulator',
  MAX_HISTORY_ITEMS: 50,
} as const;
```

### アクセシビリティ改善

```tsx
// Before
<input type="text" onChange={...} />

// After
<label htmlFor="field-name">フィールド名</label>
<input id="field-name" type="text" onChange={...} aria-describedby="field-name-help" />
<span id="field-name-help">フィールド名を入力してください</span>
```
