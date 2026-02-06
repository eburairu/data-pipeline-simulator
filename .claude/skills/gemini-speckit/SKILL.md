---
name: gemini-speckit
description: Gemini CLIを使用してSDD（Specification-Driven Development）仕様書を作成する。機能要件や改善項目からspec.mdとtasks.mdを生成。
user-invocable: true
allowed-tools: Bash, Read, Write, Glob, Grep
argument-hint: "<仕様番号> <機能名> <要件の説明>"
---

# Gemini SDD Specification スキル

Gemini CLIにSDD仕様書の作成を委任します。

## 使用方法

```
/gemini-speckit 014 "新機能名" "機能の詳細な説明や要件"
/gemini-speckit 015 "バグ修正" "修正すべき問題の説明"
```

## 実行手順

1. ユーザーの入力 `$ARGUMENTS` を解析（仕様番号、機能名、要件）
2. 既存の仕様書フォーマットを参考に
3. Gemini CLIでspec.mdとtasks.mdを生成
4. `.specify/specs/` ディレクトリに保存

## 入力解析

`$ARGUMENTS` は以下の形式を期待:
- 第1引数: 仕様番号（例: 014）
- 第2引数: 機能名（例: "new-feature"）
- 第3引数以降: 要件の説明

## Gemini CLI実行コマンド

### spec.md の生成

```bash
SPEC_NUM="<番号>"
FEATURE_NAME="<機能名>"
REQUIREMENTS="<要件>"

cat << 'TEMPLATE_EOF'
以下のSDD仕様書テンプレートに従って、spec.mdを生成してください。

# テンプレート構造

```markdown
# 機能仕様書: <機能名>

**機能ブランチ**: `<番号>-<機能名>`
**作成日**: <今日の日付>
**ステータス**: ドラフト
**入力**: <入力元>

## 背景

<なぜこの機能/修正が必要か>

## ユーザーシナリオとテスト

### ユーザーストーリー 1 - <ストーリー名> (優先度: P1/P2/P3)

<ストーリーの説明>

**この優先度の理由**: <理由>

**独立テスト**: <テスト方法>

**受け入れシナリオ**:
1. **前提条件** ..., **操作** ..., **期待結果** ...

---

### エッジケース

- <エッジケース1>
- <エッジケース2>

## 要件

### 機能要件

- **FR-001**: システムは...しなければならない
- **FR-002**: ...

### 主要エンティティ

- **Entity1**: <説明>
- **Entity2**: <説明>

## 成功基準

### 測定可能なアウトカム

- **SC-001**: <測定可能な基準>
- **SC-002**: ...

## 技術的考慮事項

### 推奨アプローチ

<技術的な実装方針>
```

# 要件

TEMPLATE_EOF

echo "$REQUIREMENTS" | gemini -p "上記テンプレートに従って、以下の要件からspec.mdを日本語で生成してください。マークダウン形式で出力し、コードブロックで囲まないでください。"
```

### tasks.md の生成

```bash
cat << 'TEMPLATE_EOF'
以下のタスクテンプレートに従って、tasks.mdを生成してください。

# テンプレート構造

```markdown
# タスク: <機能名>

**入力**: `/specs/<番号>-<機能名>/` からの設計ドキュメント
**前提条件**: spec.md

## フォーマット: `[ID] [P?] [Story] 説明`

- **[P]**: 並行実行可能（異なるファイル、依存関係なし）
- **[Story]**: このタスクが属するユーザーストーリー（US1, US2, ...）

---

## フェーズ 1: <フェーズ名>

**目的**: <このフェーズの目的>

- [ ] T001 [P] [US1] <タスク説明>
- [ ] T002 [US1] <タスク説明>

**チェックポイント**: <このフェーズ完了時の状態>

---

## フェーズ 2: ...

...
```

# spec.mdの内容

TEMPLATE_EOF

cat ".specify/specs/${SPEC_NUM}-${FEATURE_NAME}/spec.md" | gemini -p "上記テンプレートに従って、このspec.mdからtasks.mdを日本語で生成してください。タスクは具体的で実行可能なものにしてください。マークダウン形式で出力し、コードブロックで囲まないでください。"
```

## 完全な実行フロー

1. **ディレクトリ作成**
   ```bash
   mkdir -p ".specify/specs/${SPEC_NUM}-${FEATURE_NAME}"
   ```

2. **spec.md生成**（上記コマンド実行）

3. **tasks.md生成**（上記コマンド実行）

4. **結果確認**
   ```bash
   ls -la ".specify/specs/${SPEC_NUM}-${FEATURE_NAME}/"
   ```

## 注意事項

- 生成後は内容を確認し、必要に応じて手動で調整
- 仕様番号は既存の仕様と重複しないこと
- 機能名はケバブケース（kebab-case）で指定
- 日本語で出力すること
