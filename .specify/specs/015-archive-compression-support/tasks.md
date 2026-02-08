# Tasks: 015-archive-compression-support

## Phase 1: 基礎実装 (Engine)
- [x] `src/lib/ArchiveEngine.ts` の作成
    - [x] `CompressionFormat` 型の定義
    - [x] `compress` 関数の実装 (擬似プレフィックス付与)
    - [x] `decompressRecursive` 関数の実装 (多段展開・再帰処理)
    - [x] ネストされたアーカイブ（tar.gz 内の csv.gz など）のテストコードの作成

## Phase 2: データモデルと型の更新
- [x] `src/lib/types.ts` の `GenerationJob` に `compressionActions` (配列) フィールドを追加
- [x] `src/lib/MappingTypes.ts` の `SourceConfig` に `decompression` フィールドを追加
- [x] `src/lib/MappingTypes.ts` の `TargetConfig` に `compressionActions` (配列) フィールドを追加

## Phase 3: Executor への統合
- [x] `src/lib/hooks/useSimulationTimers.ts` のデータ生成ロジックへの統合
    - [x] `compressionActions` 配列をループして `compress` を順次適用するロジックの実装
- [x] `src/lib/MappingEngine.ts` のソース読み込みロジックへの統合
    - [x] 読み込み後の `decompress` 呼び出し
    - [x] `tar` 展開時の複数ファイル処理の検討と実装
- [x] `src/lib/MappingEngine.ts` のターゲット書き出しロジックへの統合
    - [x] 書き出し前の `compress` 呼び出し

## Phase 4: UI 実装
- [x] `src/components/settings/DataSourceSettings.tsx` への圧縮設定追加
- [x] `src/components/settings/mapping/SourceConfigPanel.tsx` への展開設定追加
- [x] `src/components/settings/mapping/TargetConfigPanel.tsx` への圧縮設定追加

## Phase 5: 動作確認・検証
- [x] アーカイブ・圧縮されたファイルが仮想FS上に正しく生成されることの確認
- [x] アーカイブファイルがマッピングエンジンで正しく読み込まれ、展開されることの確認
- [x] `tar.gz` などの複合形式が正しく動作することの確認
