# Data Pipeline Simulator 収集機能強化計画

## 概要

Informatica IDMC CDI-R (Cloud Data Ingestion and Replication) との機能比較に基づき、Data Pipeline Simulatorのデータ収集機能を強化する計画。

## 機能比較サマリー

| カテゴリ | IDMC CDI-R | 現状Simulator | ステータス |
|---------|-----------|--------------|----------|
| **収集方式** ||||
| ポーリング | ✅ | ✅ | 実装済み |
| ファイルリスナー（イベント駆動） | ✅ | ❌ | **要実装** |
| CDC (Change Data Capture) | ✅ | ❌ | **要実装** |
| **スケジューリング** ||||
| 固定間隔 | ✅ | ✅ | 実装済み |
| Cronスケジュール | ✅ | ❌ | **要実装** |
| 手動実行 | ✅ | ❌ | **要実装** |
| **増分処理** ||||
| 全量ロード | ✅ | ✅ | 実装済み |
| 増分ロード | ✅ | △ (Topic購読のみ) | **要拡張** |
| 初期+増分複合 | ✅ | ❌ | **要実装** |
| **エラー処理** ||||
| 基本エラー処理 | ✅ | ✅ | 実装済み |
| リトライ機構 | ✅ | ❌ | **要実装** |
| 失敗時継続 | ✅ | ❌ | **要実装** |
| 通知機能 | ✅ | ❌ | 低優先度 |
| **並列処理** ||||
| ジョブ並行実行 | ✅ | ✅ | 実装済み |
| 並列ファイルバッチ | ✅ | ❌ | 中優先度 |
| **ファイル操作** ||||
| 移動/コピー | ✅ | ✅ | 実装済み |
| 圧縮/解凍 | ✅ | ❌ | 中優先度 |
| ファイル安定性チェック | ✅ | ❌ | **要実装** |
| **データソース** ||||
| ファイルシステム | ✅ | ✅ | 実装済み |
| データベース収集 | ✅ | ❌ | 中優先度 |

---

## 不足機能リスト（優先度順）

### 高優先度

1. **ファイルリスナー（イベント駆動収集）** - ファイル到着時に即座に収集トリガー
2. **増分処理モード** - 初期ロード/増分ロード/初期+増分複合
3. **CDC（Change Data Capture）** - データベース変更のキャプチャ
4. **リトライ機構** - exponential backoffによる自動リトライ
5. **Cronスケジュール** - 日次/週次/月次スケジュール

### 中優先度

6. 行フィルター（レコードレベルフィルタ）
7. 並列ファイルバッチ処理
8. 圧縮/解凍シミュレーション
9. データベースソースからの収集
10. 手動実行機能

### 低優先度

11. 通知機能
12. ファイル安定性チェック

---

## 実装計画

### Phase 1: 基盤強化

**実装内容:**
- 増分処理モード（full / incremental / initial_and_incremental）
- リトライ機構（maxRetries, retryDelayMs, backoffMultiplier）
- エラー時継続オプション（continueOnError）

**型定義の追加 (`src/lib/types.ts`):**
```typescript
export type LoadMode = 'full' | 'incremental' | 'initial_and_incremental';

export interface IncrementalConfig {
  trackingMethod: 'timestamp' | 'processed_list';
  lastProcessedTimestamp?: number;
}

export interface RetryConfig {
  maxRetries: number;           // デフォルト: 3
  retryDelayMs: number;         // デフォルト: 1000
  backoffMultiplier?: number;   // デフォルト: 2
  continueOnError?: boolean;    // デフォルト: false
}

export interface CollectionJob {
  // 既存フィールド...
  loadMode?: LoadMode;
  incrementalConfig?: IncrementalConfig;
  retryConfig?: RetryConfig;
}
```

**修正ファイル:**
- [types.ts](src/lib/types.ts) - 型定義追加
- [useSimulationEngine.ts](src/lib/hooks/useSimulationEngine.ts) - ロジック実装
- [CollectionSettings.tsx](src/components/settings/CollectionSettings.tsx) - UI追加
- [validation.ts](src/lib/validation.ts) - バリデーション追加

### Phase 2: イベント駆動収集

**実装内容:**
- ファイルリスナートリガー（ファイル到着イベント検出）
- CDC（Change Data Capture）シミュレーション

**型定義の追加:**
```typescript
export type CollectionTriggerType = 'polling' | 'file_listener';

export interface FileListenerConfig {
  eventTypes: ('create' | 'update' | 'delete')[];
  stabilityCheckMs?: number;
  debounceMs?: number;
}

export type CDCMode = 'query_based' | 'log_based';

export interface CDCConfig {
  mode: CDCMode;
  sourceTableId: string;
  trackingColumn?: string;
  captureDeletes?: boolean;
}

export interface CollectionJob {
  // 既存フィールド...
  triggerType?: CollectionTriggerType;
  fileListenerConfig?: FileListenerConfig;
  cdcEnabled?: boolean;
  cdcConfig?: CDCConfig;
}
```

**修正ファイル:**
- [VirtualFileSystem.tsx](src/lib/VirtualFileSystem.tsx) - イベント発火機能追加
- [VirtualDB.tsx](src/lib/VirtualDB.tsx) - CDCログテーブル追加
- [useSimulationEngine.ts](src/lib/hooks/useSimulationEngine.ts) - リスナー/CDC処理
- [CollectionSettings.tsx](src/components/settings/CollectionSettings.tsx) - UI追加

### Phase 3: スケジューリング強化

**実装内容:**
- Cronスケジュール（日次/週次/月次）
- 手動実行機能
- 次回実行時刻の表示

**型定義の追加:**
```typescript
export type ScheduleType = 'interval' | 'cron' | 'manual';

export interface CronScheduleConfig {
  expression: string;  // 簡易Cron: "0 9 * * *" = 毎日9時
  timezone?: string;
}

export interface CollectionJob {
  // 既存フィールド...
  scheduleType?: ScheduleType;
  cronConfig?: CronScheduleConfig;
}
```

**新規ファイル:**
- `src/lib/cronParser.ts` - 簡易Cronパーサー

**修正ファイル:**
- [useSimulationTimers.ts](src/lib/hooks/useSimulationTimers.ts) - Cronスケジュール対応
- [CollectionSettings.tsx](src/components/settings/CollectionSettings.tsx) - UI追加

### Phase 4: 高度な機能

**実装内容:**
- 行フィルター
- 並列ファイルバッチ処理
- 圧縮/解凍シミュレーション

**型定義の追加:**
```typescript
export interface RowFilter {
  field: string;
  operator: '=' | '!=' | '>' | '<' | 'contains';
  value: string;
}

export interface FileActionConfig {
  action: 'compress' | 'decompress';
  format?: 'zip' | 'gzip';
}

export interface CollectionJob {
  // 既存フィールド...
  rowFilters?: RowFilter[];
  parallelBatchSize?: number;
  preActions?: FileActionConfig[];
  postActions?: FileActionConfig[];
}
```

---

## クリティカルファイル

| ファイル | 変更内容 |
|---------|---------|
| [src/lib/types.ts](src/lib/types.ts) | 全ての新規型定義 |
| [src/lib/hooks/useSimulationEngine.ts](src/lib/hooks/useSimulationEngine.ts) | 収集ロジック拡張 |
| [src/lib/VirtualFileSystem.tsx](src/lib/VirtualFileSystem.tsx) | イベント発火機能 |
| [src/lib/VirtualDB.tsx](src/lib/VirtualDB.tsx) | CDCログ機能 |
| [src/components/settings/CollectionSettings.tsx](src/components/settings/CollectionSettings.tsx) | UI追加 |
| [src/lib/hooks/useSimulationTimers.ts](src/lib/hooks/useSimulationTimers.ts) | Cronスケジュール |
| [src/lib/validation.ts](src/lib/validation.ts) | バリデーション追加 |

---

## 検証方法

### ユニットテスト
- Cronパーサーのテスト（`cronParser.test.ts`新規作成）
- バリデーションテストの拡張（`validation.test.ts`）

### 統合テスト（手動）
1. **増分処理テスト**: full→incremental切り替えの動作確認
2. **リトライテスト**: エラー発生時のリトライ回数・間隔の確認
3. **ファイルリスナーテスト**: ファイル作成後の即時トリガー確認
4. **CDCテスト**: DB変更がCDCログとしてキャプチャされる確認
5. **Cronテスト**: 指定時刻に実行される確認

### コマンド
```bash
npm test && npm run build
```

---

## 後方互換性

- 既存のCollectionJob設定は新フィールドなしで動作（デフォルト値設定）
- localStorage内の既存設定は読み込み時に自動マイグレーション
- 新機能は「高度な設定」セクションとして折りたたみ表示

---

## 参考リンク

- [Informatica Data Ingestion and Replication](https://docs.informatica.com/integration-cloud/data-ingestion-and-replication/current-version.html)
- [File Ingestion and Replication](https://docs.informatica.com/integration-cloud/data-ingestion-and-replication/current-version/file-ingestion-and-replication/file-ingestion-and-replication.html)
- [Database Ingestion and Replication](https://docs.informatica.com/integration-cloud/data-ingestion-and-replication/current-version/database-ingestion-and-replication/database-ingestion-and-replication.html)
