# 機能仕様書: Data Integration & Data Hub 拡張

## 概要
Data Integration (CDI) の「マッピング変数」機能と、Data Hub (CIH) の「Topicスキーマ定義・バリデーション」機能を追加し、より現実に近いデータパイプラインシミュレーションを実現する。

## 1. マッピング変数 (Mapping Variables)

### 目的
増分抽出（Incremental Extraction）やステートフルなロジックを実現するために、実行間で値を保持できる変数を導入する。

### 仕様
*   **定義**: マッピングごとに変数を定義可能とする。
    *   Name: `$$VariableName` (慣例的に `$$` で始まる)
    *   Datatype: String, Number, Date
    *   Aggregation Type: `Max`, `Min`, `Count` (今回は `Max` と `Min` を優先)
    *   Default Value: 初期値
*   **永続化**: マッピングタスクの実行終了時に、最終的な値を `ExecutionState` に保存し、次回の実行時に初期値として読み込む。
*   **関数**: 式エディタで使用可能な関数を追加。
    *   `SETVARIABLE($$Var, value)`: 変数に値をセットし、その値を返す。実行終了時に集計タイプ（Max/Min）に基づいて最終値が保存される。
    *   `GETVARIABLE($$Var)`: 現在の変数の値を返す（初期値または前回の保存値）。

### 実装詳細
*   `Mapping` インターフェースに `variables` 定義を追加。
*   `ExecutionState` に `variables: Record<string, any>` を追加。
*   `MappingEngine` の `evaluateExpression` に `state` を渡し、`SETVARIABLE` などのロジックを注入。

## 2. Topic スキーマ定義 & バリデーション (Topic Schema & Validation)

### 目的
Data Hub における Topic は単なるファイル置き場ではなく、構造化されたデータのチャネルである。Publication 時にデータを検証することで、データ品質を担保する挙動をシミュレートする。

### 仕様
*   **定義**: Topic 設定画面で、Topic ごとにスキーマ（カラム定義）を設定可能にする。
    *   Column Name
    *   Data Type (String, Number, Date, Boolean)
*   **バリデーション**:
    *   Collection Job (Publication) のターゲットが Topic の場合、ソースデータを読み込んだ後、Topic のスキーマと照合する。
    *   **CSV/JSON**: データのフィールド名と型をチェック。
    *   違反がある場合、その行（またはファイル全体）をエラーとして扱い、Topic への書き込みを行わない（またはエラーログを出力してスキップ）。
    *   今回は簡易的に、**ファイル全体をリジェクト** ではなく、**警告ログを出して通過させる** か、**厳密にエラーにする** かを選択可能にする（デフォルトはエラー）。

### 実装詳細
*   `TopicDefinition` に `schema: ColumnDefinition[]` を追加。
*   `TopicSettings` コンポーネントにスキーマエディタを追加。
*   `useSimulationEngine` の `executeCollectionJob` 内で、ターゲットが Topic の場合にバリデーションを実行。
    *   ソースがファイルの場合、内容をパースしてチェックする必要があるため、少し重くなる可能性がある。パフォーマンスに配慮し、先頭 N 行だけチェックする等の簡易実装も検討。

## 今後の拡張 (Out of Scope)
*   Mapplet (マプレット)
*   Advanced Lookup (SQL Override)
