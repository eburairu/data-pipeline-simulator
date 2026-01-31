# Constitution: Data Pipeline Simulator

## Project Vision

データパイプラインシミュレーターは、Informatica IDMC CDI のデータ統合パイプラインをブラウザ上で視覚的にシミュレートするツールです。実際の外部システムに接続せず、仮想ファイルシステムと仮想データベースを使用して、ETL処理のフローを学習・検証できます。

## Core Principles

### 1. 視覚的フィードバック優先
- パイプラインの状態変化はリアルタイムで視覚化
- ファイルの移動、変換、ロードを直感的に追跡可能

### 2. シミュレーション忠実性 (Realism)
- **非同期実行モデル**: 実際のETLツールのような非同期・ストリーム処理に近い挙動を模倣し、処理時間やレイテンシを表現する
- **詳細な可視化 (Deep Observability)**: ジョブの成否だけでなく、処理行数、スループット、ボトルネックをリアルタイムに把握可能にする
- IDMC CDI の主要概念（マッピング、コネクション、タスク）を再現

### 3. 教育・検証目的
- 外部依存なしで動作（完全ブラウザ内完結）
- 設定変更の影響を安全に確認可能

## Technical Guidelines

### フロントエンド
- React + TypeScript + Vite
- ReactFlow でパイプライン可視化
- Tailwind CSS でスタイリング
- lucide-react でアイコン

### 状態管理
- React Context API で設定管理
- useRef で実行時状態追跡
- localStorage で設定永続化

### アーキテクチャ
- 仮想ファイルシステム（VirtualFileSystemContext）
- 仮想データベース（VirtualDatabaseContext）
- **非同期MappingEngine**: 処理の途中経過をUIに通知可能な実行エンジン

## Quality Standards

- TypeScript strict mode
- ESLint による静的解析
- コンポーネント単位でのモジュール化
- 日本語UIサポート

## Out of Scope

- 実際の外部システムへの接続
- ファイルのアップロード/ダウンロード
- 認証・認可機能
- マルチユーザー対応
