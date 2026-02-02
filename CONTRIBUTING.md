# Contributing to Data Pipeline Simulator

まず、貢献を検討いただきありがとうございます！

## Conventional Commits

このプロジェクトでは[Conventional Commits](https://www.conventionalcommits.org/ja/v1.0.0/)を採用しています。
コミットメッセージは以下の形式に従ってください：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### コミットタイプ

| タイプ | 説明 | バージョン変更 |
|--------|------|--------------|
| `feat` | 新機能の追加 | Minor (1.x.0) |
| `fix` | バグ修正 | Patch (1.0.x) |
| `docs` | ドキュメントのみの変更 | なし |
| `style` | フォーマット変更（コードの意味に影響しない） | なし |
| `refactor` | リファクタリング（機能追加・バグ修正なし） | なし |
| `perf` | パフォーマンス改善 | Patch (1.0.x) |
| `test` | テストの追加・修正 | なし |
| `chore` | ビルドプロセスやツールの変更 | なし |

### Breaking Changes

破壊的変更がある場合は、フッターに `BREAKING CHANGE:` を追加するか、タイプの後に `!` を付けてください：

```
feat!: remove deprecated API endpoints

BREAKING CHANGE: The /v1/users endpoint has been removed. Use /v2/users instead.
```

これにより、Majorバージョン（x.0.0）が上がります。

### コミットメッセージの例

```bash
# 新機能
feat(pipeline): add SQL transformation support

# バグ修正
fix(mapping): resolve null pointer in Joiner node

# ドキュメント
docs: update README with installation instructions

# スコープ付きの機能追加
feat(ui): add dark mode toggle to settings panel

# 破壊的変更
feat!: change configuration file format from YAML to JSON
```

## コミット前のチェックリスト

コミットを行う前に、必ず以下のコマンドを実行してコードの健全性を確認してください。

```bash
# 1. テストの実行
npm test

# 2. ビルドと型チェック（必須）
npm run build
```

特に TypeScript の型定義を変更した場合は、`npm test` が通っても `npm run build` で失敗することがあります（未使用変数のエラーなど）。必ず両方をパスさせてください。

## 開発ワークフロー

1. `main` ブランチから新しいブランチを作成
2. 変更を実装
3. Conventional Commitsに従ってコミット
4. プルリクエストを作成
5. レビュー後、`main` にマージ
6. semantic-releaseが自動的にリリースとCHANGELOG更新を実行

## リリースプロセス

リリースは完全に自動化されています：

- `main` ブランチへのマージ時に自動実行
- コミットメッセージに基づいてバージョンを決定
- CHANGELOG.mdを自動更新
- GitHubリリースを作成
