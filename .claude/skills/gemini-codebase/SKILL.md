---
name: gemini-codebase
description: Gemini CLIを使用してコードベース全体を分析・レビューする。大規模なコード調査、アーキテクチャ分析、リファクタリング計画などに使用。
user-invocable: true
allowed-tools: Bash, Read, Glob, Grep
argument-hint: "<分析タスクの説明>"
---

# Gemini Codebase Analysis スキル

Google Gemini CLIにコードベース全体の分析タスクを委任します。

## 使用方法

```
/gemini-codebase "このプロジェクトのアーキテクチャを分析して"
/gemini-codebase "MappingEngineの実装を詳しく調べて改善点を提案して"
/gemini-codebase "テストカバレッジの不足を特定して"
/gemini-codebase "パフォーマンスボトルネックを調査して"
```

## プロジェクト情報

このプロジェクトは Data Pipeline Simulator です：
- React 19 + TypeScript 5.9
- ETLパイプラインのシミュレーター
- 主要ファイル: `src/lib/MappingEngine.ts`, `src/App.tsx`

## 実行手順

1. ユーザーのタスク `$ARGUMENTS` を受け取る
2. プロジェクト構造とコンテキストを収集
3. 関連するソースファイルを特定
4. Gemini CLIに非対話モードで委任

## Gemini CLI実行コマンド

### プロジェクト構造の分析
```bash
(echo "# プロジェクト構造"; tree -I 'node_modules|dist|coverage' --dirsfirst; echo -e "\n# package.json"; cat package.json) | gemini -p "$ARGUMENTS"
```

### ソースコード全体の分析
```bash
(echo "# プロジェクト: Data Pipeline Simulator"; echo "# ディレクトリ構造:"; tree src -I 'node_modules'; echo -e "\n# 主要ファイル:"; for f in src/App.tsx src/lib/MappingEngine.ts src/lib/types.ts; do echo -e "\n## $f"; cat "$f"; done) | gemini -p "$ARGUMENTS"
```

### 特定ディレクトリの分析
```bash
find src/lib -name "*.ts" ! -name "*.test.ts" -exec sh -c 'echo "=== {} ==="; cat {}' \; | gemini -p "$ARGUMENTS"
```

### コンポーネント分析
```bash
find src/components -name "*.tsx" -exec sh -c 'echo "=== {} ==="; cat {}' \; | gemini -p "$ARGUMENTS"
```

## 分析タスク例

- **アーキテクチャ分析**: 全体構造、依存関係、設計パターンの評価
- **コード品質**: 複雑度、重複、ベストプラクティス違反の検出
- **リファクタリング提案**: 改善点と具体的な変更案
- **テスト分析**: カバレッジ不足、テストケース提案
- **パフォーマンス**: ボトルネック、最適化ポイントの特定

## 注意事項

- 大規模な分析は時間がかかる場合がある
- 結果は日本語で報告すること
- .env等の機密ファイルは除外すること
