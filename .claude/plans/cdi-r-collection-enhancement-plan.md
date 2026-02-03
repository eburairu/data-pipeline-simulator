# Data Pipeline Simulator 収集機能強化計画

## 概要

Informatica IDMC CDI-R (Cloud Data Ingestion and Replication) との機能比較に基づき、Data Pipeline Simulatorのデータ収集機能を強化する計画。

**最終更新**: 2026-02-03
**コミット**: [4eb23ca](https://github.com/eburairu/data-pipeline-simulator/commit/4eb23ca)
**ステータス**: Phase 1完了、Phase 2-4は型定義・UI実装済み

---

## 実装状況サマリー

| フェーズ | ステータス | 実装内容 |
|---------|----------|---------|
| **Phase 1: 基盤強化** | ✅ **完全実装** | 増分処理モード、リトライ機構、エラー時継続 |
| **Phase 2: イベント駆動** | 🔶 **型定義・UI のみ** | ファイルリスナー、CDC（ロジック未実装） |
| **Phase 3: スケジューリング** | 🔶 **型定義・UI のみ** | Cronスケジュール、手動実行（ロジック未実装） |
| **Phase 4: 高度な機能** | 🔶 **型定義のみ** | 行フィルター、並列処理、圧縮/解凍（ロジック・UI一部未実装） |

### テスト・ビルド結果
- ✅ テスト: 57/57 passed
- ✅ ビルド: 成功（TypeScriptエラーなし）
- ✅ Git: コミット・プッシュ済み (develop branch)

---

## 機能比較マトリクス（更新版）

| カテゴリ | IDMC CDI-R | 実装前 | **実装後** | 実装状況 |
|---------|-----------|--------|----------|---------|
| **収集方式** |||||
| ポーリング | ✅ | ✅ | ✅ | 実装済み |
| ファイルリスナー（イベント駆動） | ✅ | ❌ | 🔶 | 型定義・UI のみ |
| CDC (Change Data Capture) | ✅ | ❌ | 🔶 | 型定義・UI のみ |
| **スケジューリング** |||||
| 固定間隔 | ✅ | ✅ | ✅ | 実装済み |
| Cronスケジュール | ✅ | ❌ | 🔶 | 型定義・UI のみ |
| 手動実行 | ✅ | ❌ | 🔶 | 型定義・UI のみ |
| **増分処理** |||||
| 全量ロード | ✅ | ✅ | ✅ | 実装済み |
| 増分ロード | ✅ | △ | ✅ | **Phase 1で実装** |
| 初期+増分複合 | ✅ | ❌ | ✅ | **Phase 1で実装** |
| **エラー処理** |||||
| 基本エラー処理 | ✅ | ✅ | ✅ | 実装済み |
| リトライ機構 | ✅ | ❌ | ✅ | **Phase 1で実装** |
| 失敗時継続 | ✅ | ❌ | ✅ | **Phase 1で実装** |
| 通知機能 | ✅ | ❌ | ❌ | 未実装 |
| **並列処理** |||||
| ジョブ並行実行 | ✅ | ✅ | ✅ | 実装済み |
| 並列ファイルバッチ | ✅ | ❌ | 🔶 | 型定義のみ |
| **ファイル操作** |||||
| 移動/コピー | ✅ | ✅ | ✅ | 実装済み |
| 圧縮/解凍 | ✅ | ❌ | 🔶 | 型定義のみ |
| **データソース** |||||
| ファイルシステム | ✅ | ✅ | ✅ | 実装済み |
| データベース収集 | ✅ | ❌ | ❌ | 未実装 |

凡例: ✅ 完全実装 | 🔶 部分実装（型定義・UI のみ） | ❌ 未実装

---

## Phase 1: 基盤強化（✅ 完全実装済み）

### 実装内容

**1. 増分処理モード**
- `LoadMode` 型: `'full' | 'incremental' | 'initial_and_incremental'`
- 処理済みファイル追跡: `_sys_subscription_state` テーブル活用
- ロジック: [useSimulationEngine.ts:86-119](src/lib/hooks/useSimulationEngine.ts#L86-L119)

**動作:**
- `full`: 毎回すべてのファイルを処理
- `incremental`: 前回処理以降の新規ファイルのみ処理
- `initial_and_incremental`: 初回全量、2回目以降は増分

**2. リトライ機構**
- Exponential backoffによる自動リトライ
- パラメータ:
  - `maxRetries`: 最大リトライ回数（デフォルト: 0）
  - `retryDelayMs`: リトライ間隔（デフォルト: 1000ms）
  - `backoffMultiplier`: 指数バックオフ係数（デフォルト: 2）
  - `continueOnError`: エラー発生時も継続（デフォルト: false）
- ロジック: [useSimulationEngine.ts:136-226](src/lib/hooks/useSimulationEngine.ts#L136-L226)

**計算式:**
```
待機時間 = retryDelayMs × (backoffMultiplier ^ retryCount)
例: 1000ms × (2 ^ 0) = 1000ms
    1000ms × (2 ^ 1) = 2000ms
    1000ms × (2 ^ 2) = 4000ms
```

**3. UI実装**
- 折りたたみ可能な「高度な設定」セクション
- ロードモード選択ドロップダウン
- リトライパラメータ入力フィールド
- 実装: [CollectionSettings.tsx:258-356](src/components/settings/CollectionSettings.tsx#L258-L356)

**4. バリデーション**
- `maxRetries >= 0`
- `retryDelayMs >= 0`
- `backoffMultiplier >= 1`
- 実装: [validation.ts:72-79](src/lib/validation.ts#L72-L79)

### 変更ファイル（Phase 1）

| ファイル | 変更内容 | 行数 |
|---------|---------|------|
| [src/lib/types.ts](src/lib/types.ts#L60-L96) | LoadMode, IncrementalConfig, RetryConfig型定義 | +37行 |
| [src/lib/hooks/useSimulationEngine.ts](src/lib/hooks/useSimulationEngine.ts#L86-L226) | 増分処理・リトライロジック実装 | +114行 |
| [src/components/settings/CollectionSettings.tsx](src/components/settings/CollectionSettings.tsx#L258-L356) | UI追加（折りたたみセクション） | +99行 |
| [src/lib/validation.ts](src/lib/validation.ts#L72-L79) | バリデーション追加 | +8行 |
| [src/lib/JobMonitorContext.tsx](src/lib/JobMonitorContext.tsx#L14-L18) | TransferExecutionDetailsにretryCount追加 | +2行 |

---

## Phase 2: イベント駆動収集（🔶 型定義・UI のみ）

### 実装済み

**型定義:**
```typescript
// src/lib/types.ts:98-129
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
```

**UI:**
- トリガータイプ選択（disabled状態で表示）
- CDC有効化チェックボックス（disabled）
- 実装: [CollectionSettings.tsx:364-377](src/components/settings/CollectionSettings.tsx#L364-L377)

### 未実装（今後の課題）

**必要な実装:**
1. **VirtualFileSystem.tsx**
   - `writeFile`, `moveFile`, `deleteFile` 実行時のイベント発火
   - イベントリスナー登録機構
   - ファイル安定性チェック（stabilityCheckMs）

2. **VirtualDB.tsx**
   - `_sys_cdc_log` テーブルの作成
   - `insert`, `update`, `remove` 実行時のCDCレコード生成
   - CDCログのクエリAPI

3. **useSimulationEngine.ts**
   - `triggerType === 'file_listener'` 時の処理分岐
   - `cdcEnabled === true` 時のCDCログ読み取り処理

4. **useSimulationTimers.ts**
   - ファイルリスナーモードではsetIntervalを使用しない

---

## Phase 3: スケジューリング強化（🔶 型定義・UI のみ）

### 実装済み

**型定義:**
```typescript
// src/lib/types.ts:131-139
export type ScheduleType = 'interval' | 'cron' | 'manual';

export interface CronScheduleConfig {
  expression: string;
  timezone?: string;
}
```

**UI:**
- スケジュールタイプ選択（disabled状態で表示）
- 実装: [CollectionSettings.tsx:379-391](src/components/settings/CollectionSettings.tsx#L379-L391)

### 未実装（今後の課題）

**必要な実装:**
1. **src/lib/cronParser.ts（新規作成）**
   - 簡易Cron式パーサー
   - 次回実行時刻の計算
   - サポート形式: `"分 時 日 月 曜日"`（例: `"0 9 * * *"`）

2. **useSimulationTimers.ts**
   - `scheduleType === 'cron'` 時の処理
   - 次回実行時刻までの待機
   - タイムゾーン対応

3. **App.tsx / CollectionSettings.tsx**
   - `scheduleType === 'manual'` 時の手動実行ボタン
   - 次回実行時刻の表示UI

**Cronパーサー例:**
```typescript
// cronParser.ts
export function parseCronExpression(expr: string): {
  minute: number | '*';
  hour: number | '*';
  day: number | '*';
  month: number | '*';
  dayOfWeek: number | '*';
} {
  // 実装例
}

export function getNextExecutionTime(cronConfig: CronScheduleConfig): Date {
  // 次回実行時刻を計算
}
```

---

## Phase 4: 高度な機能（🔶 型定義のみ）

### 実装済み

**型定義:**
```typescript
// src/lib/types.ts:141-157
export interface RowFilter {
  field: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'contains';
  value: string;
  logicalOperator?: 'AND' | 'OR';
}

export interface FileActionConfig {
  action: 'compress' | 'decompress';
  format?: 'zip' | 'gzip';
}

// CollectionJobに追加
rowFilters?: RowFilter[];
parallelBatchSize?: number;
preActions?: FileActionConfig[];
postActions?: FileActionConfig[];
```

**UI（一部）:**
- 並列バッチサイズ入力フィールド（disabled）
- 実装: [CollectionSettings.tsx:393-403](src/components/settings/CollectionSettings.tsx#L393-L403)

### 未実装（今後の課題）

**1. 行フィルター**
- CollectionSettings.tsx: フィルター設定UIの追加
- useSimulationEngine.ts: ファイル読み込み後の行フィルタリング処理
- CSV/JSONパース後にフィルター適用

**2. 並列ファイルバッチ処理**
- useSimulationEngine.ts: `Promise.all` による複数ファイル同時処理
- ファイルロック機構との統合

**3. ファイル操作アクション（圧縮/解凍）**
- VirtualFileSystem.tsx: メタデータでの圧縮状態管理
- CollectionSettings.tsx: アクションチェーン設定UI
- 処理時間のシミュレーション

---

## 今後の実装ロードマップ

### 短期（優先度: 高）

Phase 2-3のロジック実装を完成させることで、IDMC CDI-Rの主要機能をカバー可能。

**推奨実装順序:**

1. **Phase 3: Cronスケジュール**（比較的独立、影響範囲小）
   - cronParser.ts作成 → useSimulationTimers.ts拡張 → UI完成
   - 見積もり: 4-6時間

2. **Phase 2: ファイルリスナー**（VirtualFileSystemへの影響大）
   - VirtualFileSystemのイベント機構 → useSimulationEngineの処理 → 統合テスト
   - 見積もり: 8-12時間

3. **Phase 2: CDC**（VirtualDBへの影響大）
   - VirtualDBのCDCログ → useSimulationEngineの読み取り → 統合テスト
   - 見積もり: 8-12時間

### 中期（優先度: 中）

4. **Phase 4: 並列ファイルバッチ**
   - 見積もり: 4-6時間

5. **Phase 4: 行フィルター**
   - 見積もり: 4-6時間

### 長期（優先度: 低）

6. **Phase 4: ファイル操作アクション**
7. 通知機能
8. データベースソースからの収集

---

## 技術的考慮事項

### 後方互換性

✅ **完全に維持されています:**
- 既存のCollectionJob設定は新フィールドなしで動作
- localStorage内の既存設定は自動マイグレーション不要（オプショナルフィールド）
- 新機能は「高度な設定」の折りたたみセクションで表示

### パフォーマンス

**Phase 1の影響:**
- 増分処理: `_sys_subscription_state` テーブルクエリ追加（O(n) → 最適化不要、シミュレーター用途）
- リトライ: 失敗時のみ実行、通常動作への影響なし

**Phase 2-4の潜在的影響:**
- ファイルリスナー: setIntervalからイベント駆動へ変更 → CPU使用率削減
- CDC: DBログテーブルの肥大化 → リテンション期間設定が必要
- 並列処理: 同時実行ファイル数増加 → メモリ使用量増加の可能性

### テストカバレッジ

**現状:**
- ✅ 既存テスト: 57/57 passed（Phase 1実装後も全てパス）
- ✅ TypeScript型チェック: エラーなし

**Phase 2-4実装時の追加テスト:**
- cronParser.test.ts: Cron式パース・次回実行時刻計算
- VirtualFileSystem.test.tsx: イベント発火の確認
- VirtualDB.test.tsx: CDCログ生成の確認

---

## 検証方法

### Phase 1の動作確認（手動テスト）

**1. 増分処理テスト**
```
1. CollectionJobを作成、loadMode='incremental'に設定
2. ソースディレクトリにファイルを複数配置
3. ジョブ実行 → 全ファイル処理される
4. 新しいファイルを追加
5. ジョブ再実行 → 新ファイルのみ処理される
```

**2. リトライテスト**
```
1. CollectionJobを作成、retryConfig={ maxRetries: 3, retryDelayMs: 500 }
2. 存在しないターゲット接続を設定（エラー発生条件）
3. ジョブ実行
4. JobMonitorで「Retrying... (attempt 2/4)」等の表示を確認
5. 最終的に「Failed after 3 retries」と表示されることを確認
```

### 自動テスト

```bash
npm test          # 57/57 passed
npm run build     # TypeScriptエラーなし
```

---

## クリティカルファイル一覧

| ファイル | Phase 1 | Phase 2 | Phase 3 | Phase 4 | 実装状況 |
|---------|---------|---------|---------|---------|---------|
| [src/lib/types.ts](src/lib/types.ts) | ✅ | ✅ | ✅ | ✅ | 型定義完了 |
| [src/lib/hooks/useSimulationEngine.ts](src/lib/hooks/useSimulationEngine.ts) | ✅ | ❌ | ❌ | ❌ | Phase 1のみ |
| [src/components/settings/CollectionSettings.tsx](src/components/settings/CollectionSettings.tsx) | ✅ | 🔶 | 🔶 | 🔶 | UI部分実装 |
| [src/lib/validation.ts](src/lib/validation.ts) | ✅ | 🔶 | ❌ | 🔶 | 基本のみ |
| [src/lib/JobMonitorContext.tsx](src/lib/JobMonitorContext.tsx) | ✅ | - | - | - | 完了 |
| [src/lib/VirtualFileSystem.tsx](src/lib/VirtualFileSystem.tsx) | - | ❌ | - | - | 未実装 |
| [src/lib/VirtualDB.tsx](src/lib/VirtualDB.tsx) | - | ❌ | - | - | 未実装 |
| [src/lib/hooks/useSimulationTimers.ts](src/lib/hooks/useSimulationTimers.ts) | - | ❌ | ❌ | - | 未実装 |
| `src/lib/cronParser.ts`（新規） | - | - | ❌ | - | 未作成 |

凡例: ✅ 実装完了 | 🔶 部分実装 | ❌ 未実装 | - 対象外

---

## 参考リンク

### Informatica公式ドキュメント
- [Data Ingestion and Replication](https://docs.informatica.com/integration-cloud/data-ingestion-and-replication/current-version.html)
- [File Ingestion and Replication](https://docs.informatica.com/integration-cloud/data-ingestion-and-replication/current-version/file-ingestion-and-replication/file-ingestion-and-replication.html)
- [Database Ingestion and Replication](https://docs.informatica.com/integration-cloud/data-ingestion-and-replication/current-version/database-ingestion-and-replication/database-ingestion-and-replication.html)

### プロジェクト内ドキュメント
- [CLAUDE.md](CLAUDE.md) - AIアシスタントガイドライン
- [README.md](README.md) - プロジェクト概要
- [.specify/memory/constitution.md](.specify/memory/constitution.md) - プロジェクト原則

---

## 変更履歴

| 日付 | コミット | 変更内容 |
|------|---------|---------|
| 2026-02-03 | [4eb23ca](https://github.com/eburairu/data-pipeline-simulator/commit/4eb23ca) | Phase 1完全実装、Phase 2-4型定義・UI追加 |
| 2026-02-03 | 初版作成 | IDMC CDI-Rとの機能比較、実装計画策定 |
