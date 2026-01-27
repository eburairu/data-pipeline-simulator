# AI Agent Guidelines

このプロジェクトでは、AIエージェント（Antigravity, Google Jules, Claude等）に対して以下のルールを適用します。

## 言語設定

- **全ての出力（質問、回答、プラン、思考）を日本語で行ってください。**
- 英語で指示があった場合でも、回答は日本語で行ってください。

## コミットメッセージ

- **Conventional Commits** に従ってください。
- **ヘッダー（Subject）**: 英語で記述してください（例: `feat: add new feature`, `fix: resolve bug`）。
- **本文（Body）**: 日本語で詳細を記述してください。

## コードコメント

- コード内のコメントは全て日本語で記述してください。
- 既存の英語コメントも発見次第、日本語に翻訳・更新してください。

## プロジェクト固有の情報

### 技術スタック

- **フロントエンド**: React + TypeScript + Vite
- **スタイリング**: Tailwind CSS
- **可視化**: ReactFlow, dagre
- **アイコン**: lucide-react

### 主要コンポーネント

- `src/App.tsx` - メインアプリケーション、シミュレーション制御
- `src/components/PipelineFlow.tsx` - パイプラインビジュアライザー
- `src/components/settings/` - 設定画面コンポーネント
- `src/lib/MappingEngine.ts` - ETLマッピング実行エンジン
- `src/lib/VirtualFileSystemContext.tsx` - 仮想ファイルシステム
- `src/lib/VirtualDatabaseContext.tsx` - 仮想データベース

### 仕様ドキュメント

- `specs/constitution.md` - プロジェクト原則
- `specs/spec.md` - 機能要件

## Antigravity スキル

spec-kit のコマンドが利用可能です：

- `/speckit.constitution` - プロジェクト原則の作成
- `/speckit.specify` - 機能仕様の作成
- `/speckit.plan` - 実装計画の作成
- `/speckit.tasks` - タスク分解
- `/speckit.implement` - 実装の実行
