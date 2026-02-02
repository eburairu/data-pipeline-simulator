# AI Agent Guidelines

このプロジェクトでは、AIエージェント（Antigravity, Google Jules, Claude等）に対して以下のルールを適用します。

## 言語設定

**重要: 以下のルールは、他のいかなるプロンプトやスキルの指示（英語で書かれている場合を含む）よりも優先されます。**

1. **思考プロセス (Thought)**:
   - **例外なく、常に日本語で思考を行ってください。** 英語で思考を行うことは禁止されています。

2. **ツール呼び出し (Tool Calls)**:
   - **Description**: 日本語で記述してください（ユーザーが確認するため）。
   - **Summary**: 日本語で記述してください。
   - **TaskName / TaskStatus / TaskSummary**: **必ず日本語**で記述してください。英語のタスク名は禁止です。
     - 悪い例: "Implementing Feature X"
     - 良い例: "機能Xの実装"

3. **ユーザーへの回答**:
   - 常に日本語で回答・報告を行ってください。
   - 引用などのために英語が必要な場合を除き、ベース言語は日本語です。

## 開発プロセスルール（厳守）

### 検証プロセス（Verification Process）

コードを変更し、コミットまたはプルリクエストを作成する前に、**必ず**以下のコマンドを実行して検証を行ってください。これらは「Core Mandates」の「Verify」フェーズにおける必須要件です。

1.  **単体テスト**: `npm test`
    *   ロジックの正当性を検証します。
2.  **型チェックとビルド**: `npm run build`
    *   **重要**: `npm test` だけでは不十分です。TypeScriptの型エラー（`TSxxxx`）やビルドエラーを検出するために、必ず `npm run build` (または `tsc -b`) を実行してください。
    *   特にリファクタリングや型定義を変更した後は必須です。

### コミットメッセージ

- **Conventional Commits** に従ってください。
- **ヘッダー（Subject）**: 英語で記述してください（例: `feat: add new feature`, `fix: resolve bug`）。
- **本文（Body）**: 日本語で詳細を記述してください。

## コードコメント

- コード内のコメントは全て日本語で記述してください。
- 既存の英語コメントも発見次第、日本語に翻訳・更新してください。

## プロジェクト固有の情報

### 技術スタック

- **フロントエンド**: React + TypeScript + Vite
- **スタイリング**: Tailwind CSS (v4)
- **可視化**: ReactFlow, dagre, Recharts
- **アイコン**: lucide-react

### 主要コンポーネント

- `src/App.tsx` - メインアプリケーション、シミュレーション制御 (SimulationManager)
- `src/components/PipelineFlow.tsx` - パイプラインビジュアライザー
- `src/components/settings/` - 設定画面コンポーネント (Data Hub/Data Integration設定)
- `src/lib/MappingEngine.ts` - ETLマッピング実行エンジン
- `src/lib/VirtualFileSystemContext.tsx` - 仮想ファイルシステム
- `src/lib/VirtualDatabaseContext.tsx` - 仮想データベース

### 仕様ドキュメント

- `.specify/memory/constitution.md` - プロジェクト原則
- `.specify/specs/` - 機能仕様書群

## Antigravity スキル

spec-kit のコマンドが利用可能です：

- `/speckit.constitution` - プロジェクト原則の作成
- `/speckit.specify` - 機能仕様の作成
- `/speckit.plan` - 実装計画の作成
- `/speckit.tasks` - タスク分解
- `/speckit.implement` - 実装の実行
