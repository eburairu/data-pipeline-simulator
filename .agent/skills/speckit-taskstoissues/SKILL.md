---
name: speckit-taskstoissues
description: 既存のタスクを利用可能な設計アーティファクトに基づいて、機能のための依存関係順のアクション可能なGitHub Issueに変換します。
---

## ユーザー入力

```text
$ARGUMENTS
```

ユーザー入力がある場合、処理を進める前に**必ず**考慮してください。

## 概要

### 1. タスクファイルの特定

リポジトリルートから `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` を実行し、`FEATURE_DIR` と `AVAILABLE_DOCS` リストを解析します。すべてのパスは絶対パスである必要があります。引数内のシングルクォートについては、エスケープ構文を使用してください。

### 2. タスクパスの抽出

実行されたスクリプトから、**tasks** へのパスを抽出します。

### 3. Gitリモートの取得

以下を実行してGitリモートを取得します：

```bash
git config --get remote.origin.url
```

> [!CAUTION]
> **警告**: リモートが GITHUB URL である場合のみ、次のステップに進んでください。

### 4. Issueの作成

リスト内の各タスクについて、GitHub MCPサーバーを使用して、Gitリモートを代表するリポジトリに新しいIssueを作成します。

> [!CAUTION]
> **警告**: リモートURLと一致しないリポジトリには、いかなる状況でも絶対にIssueを作成しないでください。
