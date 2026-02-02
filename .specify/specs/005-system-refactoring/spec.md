# 仕様書: 005-system-refactoring - システム全体のリファクタリングと最適化

## ステータス
- ステータス: 完了
- 優先度: 高
- カテゴリ: リファクタリング、型安全、パフォーマンス

## 背景
現在のコードベースにはいくつかの技術的負債があります：
- `any` 型の過度な使用。
- `App.tsx` 内の肥大化した `SimulationManager` コンポーネント。
- Reactの純粋性違反（レンダー内の非純粋関数）。
- 再レンダリングの最適化の欠如。
- 一貫性のないエラーハンドリング。

## 要件

### 1. 型安全 (Zero `any` ポリシー)
- `src/lib/types.ts` と `src/lib/MappingTypes.ts` のすべてのデータ構造に厳格なインターフェースを定義する。
- `MappingEngine.ts`、`SettingsContext.tsx`、その他のコアファイル内のすべての `any` を置き換える。
- 必要に応じてジェネリクスと型ガードを使用する。

### 2. ロジック抽出 (カスタムフック)
- `App.tsx` からシミュレーション実行ロジックを `src/lib/hooks/useSimulationEngine.ts` に抽出する。
- タイマー/インターバル管理を `src/lib/hooks/useSimulationTimers.ts` に抽出する。
- `SimulationManager` を高レベルの調整とUIのみを扱うように簡素化する。

### 3. Reactベストプラクティスと純粋性
- レンダーパス内の `Date.now()` やその他の非純粋な呼び出しを排除する。
- `useEffect` の依存配列を修正する。
- `useEffect` 内での同期的な `setState` を避ける（状態初期化または分離ロジックを使用）。
- `React.memo`、`useMemo`、`useCallback` を戦略的に実装する。

### 4. コンポーネントのモジュール化
- `src/components/common/` に共有UIコンポーネントのセットを作成する。
- `SettingsPanel` とそのサブコンポーネントをリファクタリングし、propsの受け渡しとロジックの結合を削減する。

### 5. 高度なエラーハンドリング
- グローバルな `ErrorBoundary` を実装する。
- 構造化されたエラー詳細をキャプチャするようにログシステムを強化する。

## 成功基準
- `npm run build` と `npm run lint` がゼロエラー、最小限の警告で合格する。
- アプリケーションはパフォーマンスと保守性が向上した状態で完全に機能し続ける。
- コードの複雑さ（特に `App.tsx`）が大幅に削減される。
