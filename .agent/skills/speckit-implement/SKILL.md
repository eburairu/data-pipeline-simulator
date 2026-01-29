---
name: speckit-implement
description: tasks.md で定義されたすべてのタスクを処理し実行することで、実装計画を実行します。
---

## ユーザー入力

```text
$ARGUMENTS
```

ユーザー入力がある場合、処理を進める前に**必ず**考慮してください。

## 概要

### 1. 前提条件チェック

リポジトリルートから `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` を実行し、`FEATURE_DIR` と `AVAILABLE_DOCS` リストを解析します。すべてのパスは絶対パスである必要があります。引数内のシングルクォートについては、エスケープ構文を使用してください。

### 2. チェックリストステータスの確認

（`FEATURE_DIR/checklists/` が存在する場合）：
- `checklists/` ディレクトリ内のすべてのチェックリストファイルをスキャンします
- 各チェックリストについて、以下をカウントします：
    - 合計項目数: `- [ ]`, `- [X]`, `- [x]` に一致するすべての行
    - 完了項目数: `- [X]` または `- [x]` に一致する行
    - 未完了項目数: `- [ ]` に一致する行
- ステータステーブルを作成します：

  ```text
  | Checklist | Total | Completed | Incomplete | Status |
  |-----------|-------|-----------|------------|--------|
  | ux.md     | 12    | 12        | 0          | ✓ PASS |
  | test.md   | 8     | 5         | 3          | ✗ FAIL |
  ```

- 全体のステータスを計算します：
    - **PASS**: すべてのチェックリストの未完了項目が 0
    - **FAIL**: 1つ以上のチェックリストに未完了項目がある

- **いずれかが未完了の場合**:
    - テーブルを表示し、ユーザーに確認します：「一部のチェックリストが未完了です。実装を続行しますか？ (yes/no)」
    - ユーザーの応答を待ちます。"no", "wait", "stop" の場合は停止。"yes", "proceed", "continue" の場合はステップ3へ進みます。
- **すべて完了の場合**:
    - 自動的にステップ3へ進みます。

### 3. 実装コンテキストの読み込みと分析

- **必須**: `tasks.md` を読み、完全なタスクリストと実行計画を取得します。
- **必須**: `plan.md` を読み、技術スタック、アーキテクチャ、ファイル構造を取得します。
- **存在する場合**: `data-model.md` を読み、エンティティとリレーションシップを取得します。
- **存在する場合**: `contracts/` を読み、API仕様とテスト要件を取得します。
- **存在する場合**: `research.md` を読み、技術的な決定と制約を取得します。
- **存在する場合**: `quickstart.md` を読み、統合シナリオを取得します。

### 4. プロジェクトセットアップ検証

- **必須**: 実際のプロジェクト設定に基づいて ignore ファイルを作成/検証します：

**検出と作成ロジック**:
- Gitリポジトリか確認し、そうであれば `.gitignore` を作成/検証します。
- Dockerfile* または plan.md に Docker がある → `.dockerignore` を作成/検証
- .eslintrc* がある → `.eslintignore` を作成/検証
- eslint.config.* がある → configの `ignores` エントリが必要なパターンをカバーしているか確認
- .prettierrc* がある → `.prettierignore` を作成/検証
- .npmrc または package.json がある → `.npmignore` を作成/検証（公開する場合）
- terraform ファイル (*.tf) がある → `.terraformignore` を作成/検証
- .helmignore が必要（helmチャートあり） → `.helmignore` を作成/検証

**ignoreファイルが既に存在する場合**: 必須パターンが含まれているか確認し、欠落している重要なパターンのみを追加します。
**ignoreファイルがない場合**: 検出された技術用の完全なパターンセットで作成します。

**技術別の一般的なパターン** (plan.md の技術スタックから):
- **Node.js/JavaScript/TypeScript**: `node_modules/`, `dist/`, `build/`, `*.log`, `.env*`
- **Python**: `__pycache__/`, `*.pyc`, `.venv/`, `venv/`, `dist/`, `*.egg-info/`
- **Java**: `target/`, `*.class`, `*.jar`, `.gradle/`, `build/`
- **C#/.NET**: `bin/`, `obj/`, `*.user`, `*.suo`, `packages/`
- **Go**: `*.exe`, `*.test`, `vendor/`, `*.out`
- **Ruby**: `.bundle/`, `log/`, `tmp/`, `*.gem`, `vendor/bundle/`
- **PHP**: `vendor/`, `*.log`, `*.cache`, `*.env`
- **Rust**: `target/`, `debug/`, `release/`, `*.rs.bk`, `*.rlib`, `*.prof*`, `.idea/`, `*.log`, `.env*`
- **Kotlin**: `build/`, `out/`, `.gradle/`, `.idea/`, `*.class`, `*.jar`, `*.iml`, `*.log`, `.env*`
- **C++**: `build/`, `bin/`, `obj/`, `out/`, `*.o`, `*.so`, `*.a`, `*.exe`, `*.dll`, `.idea/`, `*.log`, `.env*`
- **C**: `build/`, `bin/`, `obj/`, `out/`, `*.o`, `*.a`, `*.so`, `*.exe`, `Makefile`, `config.log`, `.idea/`, `*.log`, `.env*`
- **Swift**: `.build/`, `DerivedData/`, `*.swiftpm/`, `Packages/`
- **R**: `.Rproj.user/`, `.Rhistory`, `.RData`, `.Ruserdata`, `*.Rproj`, `packrat/`, `renv/`
- **Universal**: `.DS_Store`, `Thumbs.db`, `*.tmp`, `*.swp`, `.vscode/`, `.idea/`

**ツール固有のパターン**:
- **Docker**: `node_modules/`, `.git/`, `Dockerfile*`, `.dockerignore`, `*.log*`, `.env*`, `coverage/`
- **ESLint**: `node_modules/`, `dist/`, `build/`, `coverage/`, `*.min.js`
- **Prettier**: `node_modules/`, `dist/`, `build/`, `coverage/`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`
- **Terraform**: `.terraform/`, `*.tfstate*`, `*.tfvars`, `.terraform.lock.hcl`
- **Kubernetes/k8s**: `*.secret.yaml`, `secrets/`, `.kube/`, `kubeconfig*`, `*.key`, `*.crt`

### 5. tasks.md の解析

以下を抽出します：
- **タスクフェーズ**: Setup, Tests, Core, Integration, Polish
- **タスク依存関係**: 順次実行 vs 並行実行ルール
- **タスク詳細**: ID, 説明, ファイルパス, 並行マーカー [P]
- **実行フロー**: 順序と依存要件

### 6. タスク計画に従った実装の実行

- **フェーズごとの実行**: 次のフェーズに進む前に各フェーズを完了させます
- **依存関係の尊重**: 順次タスクは順番に実行し、並行タスク [P] は一緒に実行できます
- **TDDアプローチ**: 実装タスクの前にテストタスクを実行します
- **ファイルベースの協調**: 同じファイルに影響するタスクは順次実行する必要があります
- **検証チェックポイント**: 進む前に各フェーズの完了を検証します

### 7. 実装実行ルール

- **セットアップを最初に**: プロジェクト構造、依存関係、設定を初期化
- **コードの前にテスト**: カントラクト、エンティティ、統合シナリオのテストを書く必要がある場合
- **コア開発**: モデル、サービス、CLIコマンド、エンドポイントを実装
- **統合ワーク**: データベース接続、ミドルウェア、ログ、外部サービス
- **仕上げと検証**: ユニットテスト、パフォーマンス最適化、ドキュメント

### 8. 進捗追跡とエラー処理

- 各タスク完了後に進捗を報告します
- 非並行タスクが失敗した場合は実行を停止します
- 並行タスク [P] の場合は、成功したタスクを続行し、失敗したものを報告します
- デバッグのためのコンテキストを含む明確なエラーメッセージを提供します
- 実装を続行できない場合は次のステップを提案します
- **重要**: 完了したタスクについては、タスクファイルの [X] マークを必ず付けてください。

### 9. 完了検証

- すべての必須タスクが完了していることを確認します
- 実装された機能が元の仕様と一致することを確認します
- テストが合格し、カバレッジが要件を満たしていることを検証します
- 実装が技術計画に従っていることを確認します
- 完了した作業のサマリーと共に最終ステータスを報告します

注: このコマンドは `tasks.md` に完全なタスク内訳が存在することを前提としています。タスクが不完全または欠落している場合は、まず `/speckit.tasks` を実行してタスクリストを再生成することを提案してください。
