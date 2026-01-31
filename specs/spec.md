# Specification: Data Pipeline Simulator

## Overview

**名称**: Data Pipeline Simulator  
**目的**: IDMC CDI のデータパイプラインをブラウザ上でシミュレート  
**対象ユーザー**: データエンジニア、ETL開発者、学習者

---

## Functional Requirements

### FR1: データソース生成
- ユーザーが定義したパターンでソースファイルを自動生成
- タイムスタンプ付きファイル名（ミリ秒精度で一意性保証）
- CSV/JSON 形式をサポート

### FR2: 収集処理（Collection）
- ソースホストからファイルを取得
- 正規表現フィルターでファイル選択
- 取得時にファイル名リネーム対応

### FR3: 配信処理（Delivery）
- 中間ストレージからファイルを移動
- ターゲットパスへの配置
- 処理後ファイル削除オプション

### FR4: マッピング処理
- ソースからターゲットへのデータ変換
- Expression による計算フィールド追加
- Filter による行選択
- ファイル名列追加機能（IDMC CDI 類似）
- 冪等性担保（Idempotency）のシミュレーション
  - ターゲットへの書き込み時に重複チェックを実施
  - 重複時の挙動（Ignore/Update/Error）を選択可能

### FR5: 仮想データベース
- テーブル定義とスキーマ管理
- INSERT 操作のシミュレート
- レコード表示（テキスト/テーブルビュー）

### FR6: 実行制御
- ジョブ種別ごとの独立制御（生成/収集配信/マッピング）
- 個別および一括開始・停止

### FR7: 運用監視 (Job Monitoring)
- 全ジョブ（Collection, Delivery, Mapping）の実行履歴を記録
- ステータス（Success/Failed/Running）、処理時間、処理件数の可視化
- エラー発生時の詳細メッセージ表示
- ジョブ履歴のフィルタリングと閲覧機能

### FR8: 非同期ストリーム実行 (Async Stream Execution)
- **非同期処理**: マッピング実行を非同期で行い、UIスレッドをブロックしない
- **遅延シミュレーション**: 各変換ステップで人工的な遅延（Processing Delay）を導入し、リアルな処理時間を表現
- **プログレッシブ更新**: 全データ処理完了を待たずに、処理の進行状況（Progress）を逐次更新

### FR9: 詳細な実行統計 (Enhanced Statistics)
- **ノード別統計**: 各Transformationノードごとの入力数(Input)、出力数(Output)、エラー数(Error)を計測
- **リアルタイム表示**: ジョブ実行中に統計情報をリアルタイムでMonitor画面に反映

---

## User Scenarios

### US1: パイプライン動作確認
1. ユーザーが「All」ボタンをクリック
2. ソースファイルが自動生成される
3. ファイルが収集→配信→マッピング処理を通過
4. 結果がデータベースに格納される
5. 各ステップがビジュアライザーで強調表示

### US2: 問題診断
1. ユーザーが「Mapping」のみ停止
2. ファイルが internal ストレージに蓄積される状態を確認
3. マッピング設定を編集
4. 「Mapping」を再開して処理確認

### US3: 運用状況のモニタリング
1. ユーザーが「Monitor」タブを開く
2. 現在実行中のジョブが「Running」として表示され、処理件数がリアルタイムで増加する様子を確認
3. 完了後、詳細ログをクリックして各ノードの処理結果（Input/Output）を確認

---

## Success Criteria

- 生成されたファイルが5秒以内にパイプラインを通過（遅延設定による）
- ファイル処理状況がリアルタイムでUI反映
- 各ジョブタイプを独立して制御可能
- コンソールログで処理統計を確認可能
- 実行履歴がUI上で確認でき、エラー特定が容易であること
- マッピング実行中にブラウザがフリーズしないこと（非同期化）

---

## Entities

### DataSource
- definitions: ホスト・パス定義
- jobs: 自動生成ジョブ設定

### Connection
- name, type (file/database)
- host, directory/tableName

### Mapping
- nodes: source, transform, target
- edges: ノード間接続

### MappingTask
- mappingId, executionInterval
- enabled flag

### JobExecutionLog
- jobId, jobName, jobType
- status (Success/Failed/Running)
- startTime, endTime
- recordCount (input/output/error)
- transformationStats: Map<NodeId, Stats>
- errorMessage

---

## Assumptions

- シングルユーザー環境で動作
- ブラウザのメモリ内にすべて保持
- ページリロードで状態リセット
