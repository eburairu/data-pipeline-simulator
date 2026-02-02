# 機能仕様書: Data Hubシミュレーション機能 (Pub/Sub & リテンション)

## 概要
Data Hub の主要機能であるPub/Subモデルとデータ保持ポリシー（Retention Policy）をシミュレーションするための機能を追加する。

## 背景
現在のシミュレーターはファイルベースの1対1転送のみサポートしており、Data Hubのような「一度Publishして複数のSubscriberが受け取る」モデルや、「Subscriberが一時停止していてもデータが保持される」挙動を再現できない。

## 機能要件

### 1. トピック管理 (Topic Management)
*   **トピック定義**: 名前と保持期間（Retention Period）を持つ。
*   **仮想パス**: Topicの実体は仮想ファイルシステム上の `/topics/{topicId}/` ディレクトリとする。
*   **UI**: Topicの作成、編集、削除を行う設定画面を追加する。

### 2. パブリケーション (Collection Job)
*   Collection Jobのターゲットとして「Topic」を選択可能にする。
*   **挙動**: Source Host/Pathからファイルを読み取り、指定されたTopicディレクトリへファイルを**移動**または**コピー**する（現状のCollectionは移動なので、TopicへのPublishも移動が基本だが、Sourceを残すオプションも検討）。
    *   *決定*: Data Hubの「Ingest」は通常Sourceからデータを取り込むため、Moveで良い。ただし、Topicへは「Publish」される。
    *   ファイル名は維持、またはリネームパターンに従う。

### 3. サブスクリプション (Delivery Job)
*   Delivery Jobのソースとして「Topic」を選択可能にする。
*   **挙動**: 指定されたTopicディレクトリからファイルを読み取り、Target Host/Pathへ**コピー**する。
*   **状態管理**:
    *   各Delivery Jobは、自分がどこまで処理したか（Watermark）を管理する必要がある。
    *   シンプルにするため、処理済みファイルID（またはファイル名＋タイムスタンプ）をメモリ上で保持し、重複処理を防ぐ。
    *   または、ファイル名にタイムスタンプが含まれる前提で、「最後に処理したタイムスタンプ」を保持する（Data HubのOffsetに近い）。
    *   *決定*: ファイル名にタイムスタンプが含まれることを推奨しつつ、シミュレーション内では「処理済みファイルセット」をメモリで持つ（Job再起動でリセットされるが、シミュレーションなので許容）。

### 4. リテンションポリシー (Retention Policy)
*   **バックグラウンド処理**: 定期的に全Topicディレクトリを走査する。
*   **削除基準**: ファイルの作成日時（またはPublish日時）が `Current Time - Retention Period` より古い場合、ファイルを削除する。

## データ構造の変更

### SettingsContext

```typescript
interface Topic {
  id: string;
  name: string;
  retentionPeriod: number; // ミリ秒（executionIntervalに合わせる）
}

interface CollectionJob {
  // ... 既存フィールド
  targetType: 'host' | 'topic';
  targetTopicId?: string; // targetType === 'topic' の場合に使用
}

interface DeliveryJob {
  // ... 既存フィールド
  sourceType: 'host' | 'topic';
  sourceTopicId?: string; // sourceType === 'topic' の場合に使用
}
```

## UI変更点

1.  **トピック設定**: 新しいタブまたはセクションとして追加。
2.  **Collection設定**: Target設定に `Type` (Host/Topic) 切り替えを追加。
3.  **Delivery設定**: Source設定に `Type` (Host/Topic) 切り替えを追加。

## 実装ステップ
1.  `SettingsContext` に `topics` stateと型を追加。
2.  `TopicSettings` コンポーネントの実装。
3.  `CollectionSettings` / `DeliverySettings` の改修。
4.  `App.tsx` (SimulationControl) にPub/SubロジックとRetentionロジックを追加。
