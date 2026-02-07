# Advanced CIH & CDI Features

## Status
- **ID**: 017
- **Status**: Draft
- **Author**: Jules
- **Date**: 2024-05-23

## 概要
データパイプラインシミュレーターのリアリティ向上のため、CIH（Data Hub）および CDI（Data Integration）の高度な機能を実装する。
具体的には、CIHの遅延配信（Delayed Subscription）と、CDIのルックアップキャッシュの永続化（Persistent Lookup Cache）を追加する。

## 要件

### 1. CIH: Delayed Subscription
- **概要**: パブリケーション（ファイル）がトピックに配置されてから、一定時間が経過するまでサブスクリプション（Delivery Job）がそれを処理しないようにする。
- **設定**: Delivery Job に `delayMs` (ミリ秒) 設定を追加。
- **挙動**: `executeDeliveryJob` 実行時、トピック内のファイルの `createdAt` と現在時刻を比較し、`(now - createdAt) < delayMs` の場合は処理をスキップする。

### 2. CDI: Persistent Lookup Cache
- **概要**: ルックアップ変換において、参照テーブルのデータをローカルファイルにキャッシュし、再利用可能にする。これにより、初回実行時はDBアクセスが発生するが、2回目以降はファイル読み込みのみとなり、パフォーマンス特性の変化をシミュレートできる。
- **設定**: Lookup Transformation に以下の設定を追加。
  - `cacheType`: 'static' (default, current behavior) | 'persistent'
  - `persistentCacheFileName`: string (optional, e.g., 'lookup_cache.json')
- **挙動**:
  - `cacheType` が 'persistent' の場合:
    - 指定されたキャッシュファイルが存在するか確認（`fs.listFiles`）。
    - 存在すれば、そのファイルを読み込み（`fs.readFile`）、メモリ上のルックアップキャッシュとして使用（DBアクセスなし）。
    - 存在しなければ、通常通りDBから全件取得し、メモリキャッシュを作成すると同時に、指定されたファイル名でキャッシュファイルを保存する（`fs.writeFile`）。
    - キャッシュファイルは `FileSystem` 上に保存される。パスは設定値に基づくが、未指定の場合はデフォルトパスを使用する。

## 技術仕様

### データモデル変更
- `DeliveryJob` (`src/lib/types.ts`): `delayMs?: number` を追加。
- `LookupConfig` (`src/lib/MappingTypes.ts`): `cacheType?: 'static' | 'persistent'`, `persistentCacheFileName?: string` を追加。

### インターフェース変更
- `FileSystemOps` (`src/lib/MappingEngine.ts`): `listFiles` の戻り値型に `createdAt?: number` を追加。

### ロジック変更
- `processLookup` (`src/lib/MappingEngine.ts`): `fs` 引数を追加し、キャッシュロジックを実装。
- `executeDeliveryJob` (`src/lib/hooks/useSimulationEngine.ts`): 遅延ロジックを実装。
