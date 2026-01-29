# Feature Specification: ETL Enhancements for IDMC CDI Simulation

**Feature Branch**: `feat/etl-enhancements`
**Created**: 2026-05-21
**Status**: Draft
**Input**: User Request for more realistic pipeline simulation

## Overview
本仕様は、IDMC CDI (Cloud Data Integration) のシミュレーションをより現実に近づけるため、ETL処理能力を強化するものである。具体的には、Expression変換における関数ライブラリの拡充、およびエラー行を適切に処理するためのReject File (Bad File) 生成機能を実装する。

## User Scenarios & Testing

### User Story 1 - 高度なExpression関数の利用 (Priority: P1)
ユーザーは、MappingのExpression変換において、文字列操作、日付操作、数値計算などの多様な関数を使用し、複雑なデータ変換ロジックを定義できる。

**Acceptance Scenarios**:
1. **Given** Expression設定, **When** `LPAD(field, 10, '0')` を入力, **Then** 値が指定桁数になるよう0埋めされる。
2. **Given** Expression設定, **When** `IS_DATE(date_string, 'YYYY-MM-DD')` を入力, **Then** 日付形式が正しい場合にTrueが返る。
3. **Given** Expression設定, **When** `SYSDATE()` を入力, **Then** 現在の日時が返る。

### User Story 2 - Bad File (Reject File) の生成 (Priority: P1)
ユーザーは、Mapping Task実行時に発生した行レベルのエラー（型変換失敗、検証エラーなど）を、指定したディレクトリにBad Fileとして出力させ、後で確認できる。

**Acceptance Scenarios**:
1. **Given** Mapping Task設定, **When** "Bad File Directory" に `/bad_files/` を指定, **Then** エラー発生時にそのディレクトリにCSVファイルが生成される。
2. **Given** データ処理中のエラー（数値フィールドに文字が含まれる等）, **When** タスクが完了, **Then** 生成されたBad Fileに、元の行データとエラー理由が記録されている。

## Requirements

### Functional Requirements

#### Expression Functions Library
- **FR-E01**: 以下のカテゴリの関数を追加実装すること。
    - **String**: `LPAD`, `RPAD`, `REVERSE`, `REPLACE_STR`, `IS_NUMBER`, `IS_SPACES`
    - **Number**: `ABS`, `CEIL`, `FLOOR`, `ROUND`, `TRUNC`, `MOD`
    - **Date**: `GET_DATE_PART`, `LAST_DAY`, `TRUNC_DATE`, `IS_DATE`
    - **Conversion**: `TO_INTEGER`, `TO_DECIMAL`, `TO_FLOAT`
- **FR-E02**: システム変数 `SYSDATE`, `SESSSTARTTIME` をExpression内で参照可能にすること。

#### Reject File Management
- **FR-R01**: Mapping Task設定に `badFileDir` プロパティを追加すること。
- **FR-R02**: 行処理中に発生した例外、および明示的なValidatorエラーを捕捉すること。
- **FR-R03**: エラーとなった行データ (Row Data) とエラーメッセージ (Error Message) を保持し、タスク終了時にCSVファイルとして書き出すこと。
- **FR-R04**: Bad Fileの命名規則は `Bad_Rows_{TaskName}_{Timestamp}.csv` とすること。

## Technical Constraints
- `MappingEngine.ts` の `traverse` ロジックを拡張し、エラー捕捉機構を組み込む。
- ブラウザ上のシミュレーションであるため、大量のエラー行によるメモリ圧迫に注意する（今回はシミュレーションのため、数千行程度を想定しメモリ保持で可とする）。
