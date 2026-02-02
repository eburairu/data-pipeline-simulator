# 仕様書: コードベース改善

## 1. 型安全の改善

### 1.1 ExpressionFunctions のジェネリクス
**現状**: `ExpressionFunctions.ts` は引数と戻り値の型に `any` を使用（例：`IIF(condition: any, trueVal: any, falseVal: any): any`）。
**要件**:
- ジェネリクスを使用して可能な限り型の一貫性を強制する（例：`IIF<T>(condition: boolean, trueVal: T, falseVal: T): T`）。
- `MappingEngine` の動的評価との互換性を維持する。

### 1.2 i18n の型付きキー
**現状**: `t(key)` は任意の文字列を受け付け、キーが欠落している場合にランタイムエラーの可能性がある。
**要件**:
- `translations.ts` の構造に基づいて `TranslationKey` 型を定義する。
- `useTranslation` フックが string の代わりに `TranslationKey` を受け入れるよう更新する。

## 2. アーキテクチャのリファクタリング

### 2.1 App.tsx の分解
**現状**: `App.tsx` には `StorageView` と `DatabaseView` の定義、およびメインの `App` と `SimulationManager` ロジックが含まれている。
**要件**:
- `StorageView` を `src/components/views/StorageView.tsx` に抽出する。
- `DatabaseView` を `src/components/views/DatabaseView.tsx` に抽出する。
- プロパティは厳密に型付けする（`any` なし）。

### 2.2 DataContext マイグレーションロジック
**現状**: `DataContext.tsx` は `useEffect` 内でレガシーデータのマイグレーションを処理している。
**要件**:
- `src/lib/migrations/DataMigration.ts` を作成する。
- マイグレーションロジック（例：古いジョブフォーマットの更新）をこの新しいモジュールに移動する。
- マイグレーションユーティリティを `DataContext` または `SettingsContext` の初期化から呼び出す。

## 3. UI標準化

### 3.1 統一された ParamInput
**現状**: 複数の設定ファイル（`MappingTaskSettings.tsx`、`DataSourceSettings.tsx`）が独自のキー・バリューペア入力フィールドを実装している。
**要件**:
- `src/components/common/ParamInput.tsx` を作成する。
- プロパティを標準化: `value: Record<string, string>`、`onChange: (val: Record<string, string>) => void`、`placeholder?: string`。
- 設定コンポーネント内のインライン実装を置き換える。

## 4. パフォーマンス最適化

### 4.1 レンダリング最適化
**現状**: `JobMonitor` と `DatabaseView` のリストはすべてのアイテムをレンダリングしている。
**要件**:
- 仮想化が重すぎる場合、シンプルなページングまたはレンダリング制限（例：最後の100ログ/レコードを表示）を実装する。
- `JobMonitor` は既に仮想化の可能性があり、モバイルでのパフォーマンスを確保する。
