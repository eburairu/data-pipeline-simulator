# 機能仕様書: Data Integrationシミュレーション向けETL強化

**機能ブランチ**: `feat/etl-enhancements`
**作成日**: 2026-05-21
**ステータス**: 実装済み
**入力**: より現実的なパイプラインシミュレーションへのユーザー要求

## 概要
本仕様は、Data Integration のシミュレーションをより現実に近づけるため、ETL処理能力を強化するものである。具体的には、Expression変換における関数ライブラリの拡充、およびエラー行を適切に処理するためのReject File (Bad File) 生成機能を実装する。

## ユーザーシナリオとテスト

### ユーザーストーリー 1 - 高度なExpression関数の利用 (優先度: P1)
ユーザーは、MappingのExpression変換において、文字列操作、日付操作、数値計算などの多様な関数を使用し、複雑なデータ変換ロジックを定義できる。

**受け入れシナリオ**:
1. **前提条件** Expression設定, **操作** `LPAD(field, 10, '0')` を入力, **期待結果** 値が指定桁数になるよう0埋めされる。
2. **前提条件** Expression設定, **操作** `IS_DATE(date_string, 'YYYY-MM-DD')` を入力, **期待結果** 日付形式が正しい場合にTrueが返る。
3. **前提条件** Expression設定, **操作** `SYSDATE()` を入力, **期待結果** 現在の日時が返る。

### ユーザーストーリー 2 - Bad File (Reject File) の生成 (優先度: P1)
ユーザーは、Mapping Task実行時に発生した行レベルのエラー（型変換失敗、検証エラーなど）を、指定したディレクトリにBad Fileとして出力させ、後で確認できる。

**受け入れシナリオ**:
1. **前提条件** Mapping Task設定, **操作** "Bad File Directory" に `/bad_files/` を指定, **期待結果** エラー発生時にそのディレクトリにCSVファイルが生成される。
2. **前提条件** データ処理中のエラー（数値フィールドに文字が含まれる等）, **操作** タスクが完了, **期待結果** 生成されたBad Fileに、元の行データとエラー理由が記録されている。

## 要件

### 機能要件

#### Expression関数ライブラリ
- **FR-E01**: 以下のカテゴリの関数を追加実装すること。
    - **文字列**: `LPAD`, `RPAD`, `REVERSE`, `REPLACE_STR`, `IS_NUMBER`, `IS_SPACES`
    - **数値**: `ABS`, `CEIL`, `FLOOR`, `ROUND`, `TRUNC`, `MOD`
    - **日付**: `GET_DATE_PART`, `LAST_DAY`, `TRUNC_DATE`, `IS_DATE`
    - **変換**: `TO_INTEGER`, `TO_DECIMAL`, `TO_FLOAT`
- **FR-E02**: システム変数 `SYSDATE`, `SESSSTARTTIME` をExpression内で参照可能にすること。

#### リジェクトファイル管理
- **FR-R01**: Mapping Task設定に `badFileDir` プロパティを追加すること。
- **FR-R02**: 行処理中に発生した例外、および明示的なValidatorエラーを捕捉すること。
- **FR-R03**: エラーとなった行データ (Row Data) とエラーメッセージ (Error Message) を保持し、タスク終了時にCSVファイルとして書き出すこと。
- **FR-R04**: Bad Fileの命名規則は `Bad_Rows_{TaskName}_{Timestamp}.csv` とすること。

## 技術的制約
- `MappingEngine.ts` の `traverse` ロジックを拡張し、エラー捕捉機構を組み込む。
- ブラウザ上のシミュレーションであるため、大量のエラー行によるメモリ圧迫に注意する（今回はシミュレーションのため、数千行程度を想定しメモリ保持で可とする）。
