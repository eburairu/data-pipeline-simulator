# 機能仕様書: Data Integrationシミュレーション強化

**機能ブランチ**: `feat/data-integration-simulation`
**作成日**: 2026-05-21
**ステータス**: 実装済み
**入力**: Data Integrationシミュレーションへのユーザー要求

## 概要
本仕様は、現在の単純なETL処理（Raw -> Summary）を拡張し、Data Integration Platform の Data Integration の概念を取り入れたシミュレーション機能を提供するものである。具体的には、Connection（接続）、Mapping（変換ロジック）、Mapping Task（実行タスク）、Task Flow（タスクフロー）の概念を導入し、複数のデータ処理フローを並行して定義・実行・可視化可能にする。

## ユーザーシナリオとテスト

### ユーザーストーリー 1 - 接続 (Connection) の定義 (優先度: P1)
ユーザーは、物理的なホストやパス、データベースを抽象化した「Connection」を定義できる。

**この優先度の理由**: マッピング定義において、具体的なインフラ情報（ホスト名など）を隠蔽し、再利用性を高めるため。

**受け入れシナリオ**:
1. **前提条件** 設定画面, **操作** "Create Connection" をクリックし、Type "File" を選択, **期待結果** HostとDirectoryを選択して "SourceFileConn" という名前で保存できる。
2. **前提条件** 設定画面, **操作** Type "Database" を選択, **期待結果** 仮想DBテーブル名を指定して "SalesDBConn" という名前で保存できる。

### ユーザーストーリー 2 - マッピング (Mapping) の定義と可視化 (優先度: P1)
ユーザーは、SourceからTargetへのデータの流れと変換処理（Filter, Expressionなど）を「Mapping」として定義し、そのフローを可視化できる。

**受け入れシナリオ**:
1. **前提条件** Mapping Designer画面, **操作** Sourceを追加し、Filter変換を接続し、Targetに接続, **期待結果** 定義されたフローがノードグラフとして表示される。
2. **前提条件** Filter設定, **操作** "amount > 1000" のような条件を設定, **期待結果** シミュレーション時にその条件が適用される。

### ユーザーストーリー 3 - マッピングタスク (Mapping Task) の実行とモニタリング (優先度: P1)
ユーザーは、定義したMappingを実行する「Mapping Task」を作成し、シミュレーション内で実行させ、その処理状況（処理件数など）をリアルタイムで確認できる。

**受け入れシナリオ**:
1. **前提条件** シミュレーション実行中, **操作** Mapping Taskが開始される, **期待結果** パイプラインフロー図上にTaskノードが表示される。
2. **前提条件** 実行中のMapping Task, **操作** 詳細を表示, **期待結果** Source -> Transformation -> Target の各ステップを通過したレコード数がリアルタイムに更新される（例: Source 100件 -> Filter 50件 -> Target 50件）。

### ユーザーストーリー 4 - タスクフロー (Task Flow) の定義 (優先度: P2)
ユーザーは、複数のMapping Taskを組み合わせた一連の処理フローを定義し、依存関係に基づいて実行できる。

**受け入れシナリオ**:
1. **前提条件** Task Flow Designer画面, **操作** Task AとTask Bを配置し、A -> Bの矢印で接続, **期待結果** Task Aが完了した後にTask Bが実行されるフローが定義される。

## 要件

### 機能要件

#### 接続管理 (Connection Management)
- **FR-C01**: 以下のタイプをサポートするConnection定義を管理できること。
    - **Flat File**: 特定のHostとDirectoryへのパス。
    - **Database**: 仮想DBの特定テーブル（またはスキーマ）。
- **FR-C02**: Connectionは一意のIDと名前を持つ。

#### マッピング定義 (Mapping Definition)
- **FR-M01**: Mappingは、一連のTransformationのDAG（有向非巡回グラフ）として定義される。
- **FR-M02**: 以下のTransformationタイプをサポートすること。
    - **Source**: Connectionからデータを読み込む（Reader）。
    - **Target**: Connectionへデータを書き込む（Writer）。
    - **Filter**: 条件式に基づいてレコードをフィルタリングする。
    - **Expression**: 新しいフィールドの計算や既存フィールドの変換を行う。
    - **Aggregator**: Group By集計を行う。
    - **Validator**: データ品質ルールに基づくバリデーションを行う。
    - **Joiner**: 2つのデータストリームを結合する（Inner, Left, Right, Full）。
    - **Lookup**: 他のデータセットから値を参照・取得する（キャッシュ対応）。
    - **Router**: 条件に基づいてデータを複数のグループに振り分ける。
    - **Sorter**: データを指定フィールドでソートする。
    - **Union**: 複数のデータストリームを統合する。
    - **Normalizer**: 配列データをフラット化する。
    - **Rank**: データにランク付けを行う。
    - **Sequence**: 一意の連番を生成する（実行間で永続化）。
    - **UpdateStrategy**: レコードごとにDB操作（Insert/Update/Delete/Reject）を指定する。
    - **Cleansing**: 文字列トリム、置換、大文字/小文字変換などを行う。
    - **Deduplicator**: 重複レコードを除去する。
    - **Pivot**: 行データを列データに変換する。
    - **Unpivot**: 列データを行データに変換する。
    - **SQL**: 仮想データベースに対して直接SQLを実行する。
    - **WebService**: 外部Webサービス（Mock）を呼び出す。
    - **HierarchyParser**: JSONなどの階層データをフラット化する。

#### マッピングタスクと実行 (Mapping Task & Execution)
- **FR-T01**: Mapping Taskは、特定のMappingを参照し、実行スケジュール（Interval）を持つ。
- **FR-T02 (実行エンジン)**: エンジンはMapping Taskの設定に従い、Sourceからデータを読み出し、各Transformationを経てTargetに書き込む一連のフローを実行しなければならない。
- **FR-T03**: 実行中の各Transformationステップにおける「処理レコード数 (Processed Rows)」「エラー数 (Error Rows)」をメモリ上に保持し、UIから参照可能にすること。
- **FR-T04 (タスクフロー)**: 複数のMapping Taskを順序付けて実行するための「Task Flow」を定義可能にする。
    - タスク間の依存関係を定義できること。
    - 並列実行および順次実行を制御できること。
    - フロー全体を視覚的にデザインできること（Task Flow Designer）。

#### 可視化 (Visualization)
- **FR-V01 (実行時)**: Dashboard上のPipeline Flowにおいて、実行中のMapping TaskおよびTask Flowを可視化すること。
    - Task Flow内のタスク間の依存関係をエッジとして表示する。
    - Mapping Taskが入出力するデータソース（ファイル、DBテーブル）をノードとして表示し、接続関係を可視化する。
- **FR-V02 (詳細ビュー)**: 特定のMapping Taskをクリックまたは選択した際に、その内部のTransformationフローと現在のステータス（Row Count）を表示すること。
- **FR-V03 (タスクフロー)**: Task Flow Designerにおいて、タスク間の依存関係をDAGとして可視化・編集可能にすること。

### マイグレーション
- **MIG-01**: 既存の `EtlSettings` (Raw -> Summary) のロジックは、新しいMapping機能（File Source -> DB Target, DB Source -> DB Target）を用いて再実装されなければならない。

## 技術的制約
- 既存の `VirtualFileSystem` および `VirtualDB` をバックエンドとして使用する。
- 複雑なSQLパースや式評価は行わず、JavaScriptの関数評価や単純な条件評価で代用する。
