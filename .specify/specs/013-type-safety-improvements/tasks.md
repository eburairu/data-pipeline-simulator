# タスク: 型安全性・コード品質改善

**入力**: `/specs/013-type-safety-improvements/` からの設計ドキュメント
**前提条件**: spec.md

## フォーマット: `[ID] [P?] [Story] 説明`

- **[P]**: 並行実行可能（異なるファイル、依存関係なし）
- **[Story]**: このタスクが属するユーザーストーリー（US1, US2, US3, US4）

---

## フェーズ 1: セットアップ（共有インフラ）

**目的**: 新しいファイル構造の準備

- [x] T001 `src/lib/context/` ディレクトリを作成
- [x] T002 `src/lib/constants.ts` ファイルを作成（定数定義済み）

**チェックポイント**: ディレクトリ構造が準備完了

---

## フェーズ 2: ユーザーストーリー 1 - ExpressionFunctions型安全性向上 (優先度: P1)

**ゴール**: `any` 型を排除し、ジェネリクスと `unknown` を使用

**独立テスト**: TypeScriptコンパイルエラーがなく、既存のテストがパスする

### 分析と計画

- [x] T003 [US1] ExpressionFunctions.ts の全関数を分析し、型改善計画を作成

### 実装（並行実行可能）

- [x] T004 [P] [US1] 条件関数の型改善: IIF, DECODE, CASE_WHEN
- [x] T005 [P] [US1] 文字列関数の型改善: CONCAT, SUBSTRING, TRIM, UPPER, LOWER, REPLACE
- [x] T006 [P] [US1] 数値関数の型改善: TO_NUMBER, ROUND, FLOOR, CEIL, ABS
- [x] T007 [P] [US1] 日付関数の型改善: TO_DATE, DATE_FORMAT, DATE_ADD, DATE_DIFF
- [x] T008 [P] [US1] 集計関数の型改善: SUM, AVG, MIN, MAX, COUNT
- [x] T009 [P] [US1] ユーティリティ関数の型改善: COALESCE, NULLIF, IS_NULL, IS_NOT_NULL

### 検証

- [x] T010 [US1] MappingEngine.ts との統合テスト
- [x] T011 [US1] ExpressionFunctions.test.ts の既存テストがパスすることを確認

**チェックポイント**: ExpressionFunctionsから `any` 型が排除される

---

## フェーズ 3: ユーザーストーリー 2 - SettingsContext分割 (優先度: P1)

**ゴール**: SettingsContextを機能別の専門Contextに分割

**独立テスト**: 各Contextが独立して動作し、関連コンポーネントのみ再レンダリングされる

### 新規Context作成（並行実行可能）

- [x] T012 [P] [US2] `src/lib/context/PipelineContext.tsx` を作成
- [x] T013 [P] [US2] `src/lib/context/ConnectionContext.tsx` を作成
- [x] T014 [P] [US2] `src/lib/context/DataSourceContext.tsx` を作成
- [x] T015 [P] [US2] `src/lib/context/SimulationContext.tsx` を作成
- [x] T016 [P] [US2] `src/lib/context/UIContext.tsx` を作成（表示設定用）

### 統合プロバイダー

- [x] T017 [US2] `src/lib/SettingsProvider.tsx` に複合プロバイダーを作成
- [x] T018 [US2] 各Contextのカスタムフック（usePipeline, useConnection等）を作成

### 移行

- [x] T019 [US2] SettingsContext.tsx から各専門Contextにロジックを移行
- [x] T020 [US2] App.tsx のプロバイダー構造を更新
- [x] T021 [US2] 設定コンポーネントのContext使用を新しいフックに更新（ファサードパターンで後方互換性維持）

### 検証

- [x] T022 [US2] ビルド・テストで動作確認済み
- [x] T023 [US2] すべての設定画面が正常に動作することを確認（ファサード経由）

**チェックポイント**: SettingsContextの分割が完了

---

## フェーズ 4: ユーザーストーリー 3 - 定数管理の集約 (優先度: P2)

**ゴール**: マジックナンバーと繰り返し文字列を定数ファイルに集約

**独立テスト**: 定数を変更すると関連するすべての箇所に反映される

### 分析

- [x] T024 [US3] コードベース内のマジックナンバーを特定（grep検索）
- [x] T025 [US3] 繰り返し使用される文字列を特定

### 定数ファイル作成

- [x] T026 [US3] `src/lib/constants.ts` にSIMULATION定数を定義
- [x] T027 [US3] `src/lib/constants.ts` にUI定数を定義
- [x] T028 [US3] `src/lib/constants.ts` にSTORAGE定数を定義
- [x] T029 [US3] `src/lib/constants.ts` にDEFAULT_VALUES定数を定義（SYSTEM_TABLES, STEP_KEYS, TIMEOUTS, EXECUTION_DEFAULTS追加）

### 移行（並行実行可能）

- [x] T030 [P] [US3] シミュレーション関連ファイルのマジックナンバーを定数参照に置換
- [x] T031 [P] [US3] UI関連ファイルのマジックナンバーを定数参照に置換
- [x] T032 [P] [US3] ストレージ関連ファイルのマジックナンバーを定数参照に置換

**チェックポイント**: マジックナンバーの定数化が完了

---

## フェーズ 5: ユーザーストーリー 4 - アクセシビリティ改善 (優先度: P3)

**ゴール**: キーボード操作とスクリーンリーダー対応の改善

**独立テスト**: Tabキーですべてのインタラクティブ要素にアクセス可能

### 分析

- [x] T033 [US4] アクセシビリティ問題の一覧を作成（手動監査）

### フォームラベル改善（並行実行可能）

- [x] T034 [P] [US4] MappingDesigner.tsx のフォーム入力にlabel要素を追加（htmlFor/id関連付け、aria-label追加）
- [x] T035 [P] [US4] DataSourceSettings.tsx のフォーム入力にlabel要素を追加（ParamInput改善、htmlFor/id関連付け）
- [x] T036 [P] [US4] ConnectionSettings.tsx のフォーム入力にlabel要素を追加（htmlFor/id関連付け）
- [x] T037 [P] [US4] DatabaseSettings.tsx のフォーム入力にlabel要素を追加（htmlFor/id、aria-label追加）

### キーボード操作改善

- [x] T038 [US4] カスタムボタン/クリック要素にキーボードイベントハンドラーを追加（JobMonitorのカード/テーブル行にonKeyDown追加）
- [x] T039 [US4] モーダルのフォーカストラップを実装（JobDetailModalにフォーカストラップ・Esc対応・フォーカス復元）
- [x] T040 [US4] タブ順序の最適化（tabIndex追加、aria-current/aria-expandedで状態表示、navタグでタブバーをラップ）

### ARIA属性追加

- [x] T041 [US4] ステータス表示にaria-live属性を追加（App.tsxエラー表示にrole="alert"、保存結果にrole="status"）
- [x] T042 [US4] アイコンボタンにaria-label属性を追加（全コンポーネントのアイコンボタンにaria-label、装飾アイコンにaria-hidden）

**チェックポイント**: アクセシビリティ改善が完了

---

## フェーズ 6: BiDashboard型定義整備 (追加)

**目的**: BiDashboard.tsxの型安全性向上

- [x] T043 [P] BiDashboard.tsx で使用されるデータ型を `src/lib/types.ts` に定義（既存のDashboardItem型を確認）
- [x] T044 [P] ウィジェットコンポーネントのprops型を定義（DashboardWidgetProps定義済み）
- [x] T045 BiDashboard.tsx 内の暗黙のany型を排除（constructor, chartData, filter operator）

**チェックポイント**: BiDashboardの型定義が完了

---

## フェーズ 7: ポリッシュと検証

**目的**: 品質保証と最終確認

- [x] T046 [P] 新規・更新ファイルに日本語コメントを追加
- [x] T047 npm test && npm run build で最終検証
- [x] T048 TypeScript strict mode でエラーがないことを確認
- [x] T049 コードベース全体で `any` 型の使用箇所を検索し、必要性を確認
- [x] T050 アプリケーションを起動し、すべての機能が正常に動作することを確認（npm test && npm run build パス）

---

## 依存関係と実行順序

### フェーズの依存関係

- **セットアップ (フェーズ 1)**: 依存関係なし
- **US1 ExpressionFunctions (フェーズ 2)**: 依存関係なし（独立して実行可能）
- **US2 SettingsContext (フェーズ 3)**: フェーズ 1 完了に依存
- **US3 定数管理 (フェーズ 4)**: フェーズ 1 完了に依存
- **US4 アクセシビリティ (フェーズ 5)**: 依存関係なし（独立して実行可能）
- **BiDashboard型定義 (フェーズ 6)**: 依存関係なし
- **ポリッシュ (フェーズ 7)**: フェーズ 2, 3, 4, 5, 6 完了後

### ユーザーストーリー間の並行実行

- US1, US3, US4 は完全に独立して並行実行可能
- US2 はフェーズ 1 完了後に開始可能
- フェーズ 2, 3, 4, 5, 6 内の [P] マークされたタスクは並行実行可能

---

## 注記

- `any` 型の排除は段階的に行い、各ステップでテストを実行
- SettingsContext分割時は、後方互換性を考慮したファサードパターンも検討
- アクセシビリティ改善は WCAG 2.1 AA レベルを目標とする
- 定数化は意味のあるグループ単位で行い、過度な細分化を避ける
- 各フェーズ完了後に npm test && npm run build を実行して回帰を防ぐ
