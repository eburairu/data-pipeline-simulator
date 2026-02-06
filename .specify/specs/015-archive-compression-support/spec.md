# Spec: 015-archive-compression-support

## 1. 背景・目的
データパイプラインにおいて、大容量データの転送効率向上やストレージ節約のために、書庫化（tar）や圧縮（gz）は一般的に使用される。シミュレーターにおいてもこれらを扱えるようにすることで、より現実に近いデータフローの設計・検証を可能にする。

## 2. ユーザー要件
- データ生成ジョブの出力ファイルを `tar` でまとめたり、`gz` で圧縮したりしたい。
- `tar.gz` 形式への対応。
- マッピング処理（ETL）の前段で、これらの書庫・圧縮ファイルを展開・解凍して処理したい。
- 加工後のデータを再びアーカイブして出力したい。

## 3. 技術仕様

### 3.1 擬似アーカイブ形式（シミュレーション）
仮想ファイルシステム上では `string` としてデータを保持するため、以下のプレフィックス/ヘッダーを用いた擬似アーカイブ形式を採用する。

- **Gzip (`.gz`)**:
  - 形式: `[GZ]<元のコンテンツ>`
  - 例: `[GZ]id,name
1,Alice`
- **Tar (`.tar`)**:
  - 形式: `[TAR:file1.csv,file2.csv]--FILE:file1.csv--
<content1>
--FILE:file2.csv--
<content2>`
  - 複数のファイルを一つの `VFile` の `content` に連結する。
- **Tar.Gzip (`.tar.gz`)**:
  - 形式: `[GZ][TAR:...]...` （Gzipの中にTarが入っている構造）

### 3.2 アーカイブ・圧縮エンジン (`src/lib/ArchiveEngine.ts`)
以下の機能を持つユーティリティを新規作成する。
- `compress(content: string, format: CompressionFormat, filenames?: string[]): string`
- `decompressRecursive(content: string): DecompressedResult[]`
- `isCompressed(content: string): boolean`

**再帰的展開ロジック:**
1. 入力データが `[GZ]` または `[TAR]` で始まるか確認。
2. `[GZ]` の場合、中身を取り出し、再び手順1へ。
3. `[TAR]` の場合、含まれる全ファイルを抽出し、各ファイルに対して再び手順1へ。
4. 最終的にプレフィックスがなくなった状態のデータと、展開されたファイル名のリストを返す。

### 3.3 データモデルの拡張 (`src/lib/types.ts`, `src/lib/MappingTypes.ts`)

```typescript
export type CompressionFormat = 'none' | 'gz' | 'tar' | 'tar.gz' | 'zip';

// GenerationJob の拡張
export interface GenerationJob {
  // ...既存フィールド
  compressionActions?: CompressionFormat[]; // 適用する圧縮アクションの配列（順序通りに適用）
}

// Mapping SourceConfig の拡張
export interface SourceConfig {
  // ...既存フィールド
  decompression?: boolean; // 読み込み時に自動展開するかどうか
}

// Mapping TargetConfig の拡張
export interface TargetConfig {
  // ...既存フィールド
  compression?: CompressionFormat; // 書き出し時の圧縮形式
}
```

## 4. 影響範囲と実装ステップ

### Step 1: `ArchiveEngine.ts` の実装
擬似的な圧縮・展開ロジックを実装する。

### Step 2: Executor への組み込み
- `useSimulationTimers.ts`: `GenerationJob` の `writeFile` 直前で `compress` を呼び出す。
  - `tar` の場合は、単一ファイル生成でも `[TAR:filename]...` 形式にする。
- `MappingEngine.ts`: 
  - `Source` からの読み込み直後に `decompress` を呼び出し、`tar` の場合は複数レコードセットとして処理できるように拡張。
  - `Target` への書き出し直前で `compress` を呼び出す。

### Step 3: UI の更新
- `DataSourceSettings.tsx`: 各ジョブの設定に「圧縮形式」セレクトボックスを追加。
- `SourceConfigPanel.tsx`: 「展開（Decompress）」チェックボックスを追加。
- `TargetConfigPanel.tsx`: 「圧縮形式」セレクトボックスを追加。

## 5. 考慮事項
- **Tarの展開**: `tar` ファイルを展開すると、論理的には複数のファイルが出現する。シミュレーターのマッピングエンジンでは、一つのソースノードから複数のファイル由来のデータを流せるようにする必要がある。
- **ファイル名**: `tar` 内のファイル名をどのように保持・復元するか。
- **パフォーマンス**: 巨大な文字列連結になるため、メモリ使用量に注意（シミュレーションの範囲内では許容）。
