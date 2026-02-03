# データパイプライン シミュレータ (Data Pipeline Simulator)

このアプリケーションは、Data Integration Platform のアーキテクチャをモデルとした、ブラウザ上で動作するETL/ELTワークフローシミュレーションツールです。
データの生成から Data Hub を介したPub/Subモデルの転送、Data Integration による高度なデータ加工、そして仮想データベースへの格納までの一連のライフサイクルをシミュレートします。

## 主な機能

### 1. データ統合 (Data Integration)
*   **マッピングデザイナー (Mapping Designer)**: GUIベースのデザイナーを使用して、Source, Filter, Expression, Aggregator, Target などの変換ロジックを視覚的に定義できます。
*   **タスクフローデザイナー (Task Flow Designer)**: 複数のマッピングタスクを依存関係に基づいてグループ化し、一括実行や並列実行を管理します。
*   **コネクション管理 (Connections)**: ファイルシステムやデータベースへの接続情報を抽象化して管理します。
*   **マッピングタスク (Mapping Tasks)**: 定義したマッピングを実行可能なタスクとしてスケジュールし、実行履歴や統計（処理行数、エラー行数）をモニタリングできます。
*   **高度なETL機能**:
    *   **式言語 (Expression Functions)**: `LPAD`, `SYSDATE`, `IS_DATE` などの豊富な関数を使用したデータ変換。
    *   **バリデーション**: データ品質チェックと、エラー行のBad Fileへの出力機能。
    *   **多様な変換 (Transformations)**:
        *   Joiner, Lookup (キャッシュ対応), Router, Sorter, Union
        *   Normalizer, Rank, Sequence (永続化対応), UpdateStrategy
        *   Cleansing, Deduplicator, Pivot, Unpivot
        *   SQL (仮想DB操作), WebService (Mock APIコール), HierarchyParser (JSONフラット化)

### 2. データ連携ハブ (Data Hub)
*   **トピック管理 (Topics)**: データをカテゴリごとに保持・管理するトピックを定義し、データの保持期間（Retention）を設定できます。
*   **Pub/Subモデル**:
    *   **Publication (Collection)**: 外部ソースからデータを収集し、トピックへパブリッシュします。
    *   **Subscription (Delivery)**: トピックからデータをサブスクライブし、ターゲットシステムへ配信します。

### 3. データ生成と仮想インフラ
*   **データ生成 (Data Generation)**: カスタマイズ可能なスキーマやテンプレートを使用して、テスト用のCSVデータを自動生成します。
    *   サポートされるジェネレータ: `Static`, `Random Int/Float`, `Sequence`, `UUID`, `List`, `Timestamp`, `Sin/Cos` (周期的変動)
*   **仮想ファイルシステム**: ブラウザメモリ上で動作するファイルシステムにより、物理的なファイル操作なしにETLフローを再現します。
*   **仮想データベース**: SQLライクなクエリをサポートするインメモリデータベースで、処理結果を検証できます。

### 4. 可視化とモニタリング
*   **BIダッシュボード**: 処理結果をグラフ（折れ線、棒グラフ）や表で可視化し、データの傾向を分析できます。
    *   **Auto Run**: 1秒ごとの自動データ更新をサポートし、リアルタイムのモニタリングが可能です。
    *   **堅牢性**: エラー発生時もダッシュボード全体がクラッシュしないよう、ウィジェット単位のエラー境界 (Error Boundary) を備えています。
*   **ジョブモニター**: 全てのジョブ実行履歴、エラーログ、詳細な処理統計（Source/Target行数）を確認できます。

## セットアップと起動方法

このプロジェクトは React + TypeScript + Vite で構築されています。以下の手順でローカル環境で起動できます。

### 前提条件

*   Node.js (推奨バージョン: v18以降)
*   npm

### インストール

リポジトリをクローンし、依存関係をインストールします。

```bash
npm install
```

### アプリケーションの起動

開発サーバーを起動します。

```bash
npm run dev
```

ブラウザで `http://localhost:5173` (またはコンソールに表示されるURL) にアクセスしてください。

## 使い方

1.  **シミュレーション (Simulation) タブ**: データパイプライン全体のフローを可視化し、リアルタイムで監視・制御します。
2.  **設定 (Settings) タブ**:
    *   **Data Hub**: トピック、アプリケーション、Pub/Subの設定を行います。
    *   **Data Integration**: コネクション、マッピング、マッピングタスク、タスクフローの定義を行います。
    *   **Data Source**: テストデータ生成ルール定義、テンプレート管理、およびインフラ（ホスト/ディレクトリ）の設定を行います。
    *   **Database**: 仮想テーブルの定義を行います。
3.  **モニタ (Monitor) タブ**: 実行されたジョブの履歴と詳細ログを確認します。
4.  **ダッシュボード (Dashboard) タブ**: データベース内のデータを可視化します。
5.  **ドキュメント (Docs) タブ**: アプリケーション内の機能説明や関数リファレンスを参照できます。

## 詳細仕様

詳細な機能仕様については、[.specify/specs/](.specify/specs/) ディレクトリ配下のドキュメントを参照してください。
*   [初期仕様](.specify/specs/001-initial-spec/spec.md)
*   [Data Hub機能仕様](.specify/specs/002-datahub-features/spec.md)
*   [Data Integration機能仕様](.specify/specs/003-dataintegration-features/spec.md)
*   [ETL拡張仕様](.specify/specs/004-etl-enhancements/spec.md)
*   [システムリファクタリング仕様](.specify/specs/005-system-refactoring/spec.md)
*   [コードベース改善仕様](.specify/specs/006-codebase-improvements/spec.md)
*   [CDI Router修正仕様](.specify/specs/007-cdi-router-fix/spec.md)

## 技術スタック

*   **Runtime**: React 19, TypeScript
*   **Build**: Vite 7
*   **Styling**: Tailwind CSS v4
*   **Visualization**: React Flow, Recharts
*   **Icons**: Lucide React
