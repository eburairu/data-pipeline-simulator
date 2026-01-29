---
name: speckit-plan
description: 実装計画ワークフローを実行し、planテンプレートを使用してデザインアーティファクトを生成します。
---

## ユーザー入力

```text
$ARGUMENTS
```

ユーザー入力がある場合、処理を進める前に**必ず**考慮してください。

## 概要

### 1. セットアップ

リポジトリルートから `.specify/scripts/bash/setup-plan.sh --json` を実行し、JSONを解析して `FEATURE_SPEC`, `IMPL_PLAN`, `SPECS_DIR`, `BRANCH` を取得します。引数内のシングルクォートについては、エスケープ構文を使用してください。

### 2. コンテキストの読み込み

`FEATURE_SPEC` と `.specify/memory/constitution.md` を読み込みます。
`IMPL_PLAN` テンプレート（すでにコピーされているもの）を読み込みます。

### 3. 接客計画ワークフローの実行

`IMPL_PLAN` テンプレートの構造に従って以下を実行します：
- Technical Context（技術的コンテキスト）を記入（不明点は "NEEDS CLARIFICATION" とマーク）
- constitution（原則）から Constitution Check セクションを記入
- ゲートを評価（正当な理由のない違反はエラーとする）
- フェーズ 0: `research.md` を生成（すべての NEEDS CLARIFICATION を解決）
- フェーズ 1: `data-model.md`, `contracts/`, `quickstart.md` を生成
- フェーズ 1: エージェントスクリプトを実行してエージェントコンテキストを更新
- デザイン後に Constitution Check を再評価

### 4. 停止と報告

フェーズ 2 の計画後にコマンドは終了します。ブランチ、`IMPL_PLAN` パス、生成されたアーティファクトを報告します。

## フェーズ

### フェーズ 0: 概要と調査 (Outline & Research)

1. **技術的コンテキストから不明点を抽出**:
   - 各 NEEDS CLARIFICATION → 調査タスク
   - 各依存関係 → ベストプラクティスタスク
   - 各統合 → パタークタスク

2. **調査エージェントの生成とディスパッチ**:

   ```text
   技術的コンテキストの各不明点について:
     Task: "{feature context} の {unknown} について調査"
   各技術選択について:
     Task: "{domain} における {tech} のベストプラクティスを探す"
   ```

3. **調査結果の統合**: `research.md` に以下のフォーマットで統合します：
   - Decision (決定): [選択されたもの]
   - Rationale (根拠): [選ばれた理由]
   - Alternatives considered (検討された代替案): [他に評価されたもの]

**出力**: すべての NEEDS CLARIFICATION が解決された `research.md`

### フェーズ 1: デザインと契約 (Design & Contracts)

**前提条件**: `research.md` が完了していること

1. **機能仕様からエンティティを抽出** → `data-model.md`:
   - エンティティ名、フィールド、リレーションシップ
   - 要件からのバリデーションルール
   - 該当する場合は状態遷移

2. **機能要件からAPI契約を生成**:
   - 各ユーザーアクション → エンドポイント
   - 標準的な REST/GraphQL パターンを使用
   - OpenAPI/GraphQL スキーマを `/contracts/` に出力

3. **エージェントコンテキスト更新**:
   - `.specify/scripts/bash/update-agent-context.sh copilot` を実行
   - これらのスクリプトはどのAIエージェントが使用されているかを検出します
   - 適切なエージェント固有のコンテキストファイルを更新します
   - 現在の計画からの新しい技術のみを追加します
   - マーカー間の手動追加分は保持します

**出力**: `data-model.md`, `/contracts/*`, `quickstart.md`, エージェント固有ファイル

## 主要ルール

- 絶対パスを使用してください
- ゲートの失敗や未解決の明確化事項がある場合はエラー (ERROR) としてください
