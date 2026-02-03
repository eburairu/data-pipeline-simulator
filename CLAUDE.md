# CLAUDE.md - Data Pipeline Simulator AIアシスタントガイドライン

このドキュメントは、AIアシスタント（Claude Code等）がこのコードベースで作業する際に必要なコンテキストを提供します。

## プロジェクト概要

Data Pipeline Simulatorは、ETL（Extract-Transform-Load）データパイプラインをシミュレートするReactベースのWebアプリケーションです。データ生成、収集、変換（マッピングエンジン経由）、配信ワークフローの視覚的なシミュレーションを提供します。

**バージョン**: 1.1.0
**主要言語**: 日本語

## 言語要件（重要）

**すべての出力は日本語で行う必要があります。** これには以下が含まれます：
- 回答、説明、計画
- コードコメント
- タスク名と説明
- PR/コミットの本文

**例外**: コミットメッセージのヘッダーはConventional Commitsに従い英語で記述します（例：`feat:`, `fix:`）。

## 技術スタック

| カテゴリ | 技術 |
|----------|------|
| フレームワーク | React 19 + TypeScript 5.9 |
| ビルドツール | Vite 7.2 |
| スタイリング | Tailwind CSS 4.x |
| 可視化 | ReactFlow 11.x, Recharts 3.x, dagre |
| アイコン | lucide-react |
| テスト | Vitest 4.x + @testing-library/react |
| リリース | semantic-release（自動化） |

## プロジェクト構造

```
src/
├── App.tsx                      # メインアプリコンポーネント、シミュレーション制御
├── main.tsx                     # エントリーポイント
├── components/
│   ├── PipelineFlow.tsx         # ReactFlow可視化
│   ├── BiDashboard.tsx          # BI分析ダッシュボード
│   ├── JobMonitor.tsx           # ジョブ実行監視
│   ├── Documentation.tsx        # アプリ内ドキュメント
│   ├── common/                  # 共有コンポーネント（ErrorBoundary）
│   ├── nodes/                   # ReactFlowノードコンポーネント
│   ├── settings/                # 14個の設定パネルコンポーネント
│   │   ├── MappingDesigner.tsx  # ETLマッピングビジュアルデザイナー
│   │   ├── TaskFlowDesigner.tsx # タスクオーケストレーション
│   │   └── ...
│   └── views/                   # データ表示ビュー
├── lib/
│   ├── MappingEngine.ts         # コアETL実行エンジン（1000行以上）
│   ├── MappingTypes.ts          # ETL型定義
│   ├── ExpressionFunctions.ts   # ETL式評価
│   ├── DataGenerator.ts         # テストデータ生成
│   ├── VirtualFileSystem.tsx    # インメモリファイルシステム
│   ├── VirtualDB.tsx            # インメモリデータベース
│   ├── SettingsContext.tsx      # グローバル設定状態
│   ├── JobMonitorContext.tsx    # ジョブ追跡状態
│   ├── context/                 # 追加コンテキスト
│   ├── hooks/
│   │   ├── useSimulationEngine.ts  # メインシミュレーションオーケストレーション
│   │   └── useSimulationTimers.ts  # タイミング制御
│   ├── i18n/                    # 国際化
│   ├── types.ts                 # 集中型定義
│   ├── validation.ts            # 設定バリデーション
│   └── *.test.ts                # ユニットテスト（11ファイル）
└── assets/                      # 静的アセット

.specify/                        # 仕様フレームワーク
├── memory/constitution.md       # プロジェクト原則
├── specs/                       # 機能仕様（001-007）
└── templates/                   # 仕様テンプレート

.github/workflows/               # CI/CD
├── release.yml                  # セマンティックリリース
└── deploy.yml                   # GitHub Pagesデプロイ
```

## 必須コマンド

```bash
# 開発
npm run dev          # 開発サーバー起動（http://localhost:5173）

# コミット前に必須
npm test             # ユニットテスト実行（vitest）
npm run build        # TypeScriptチェック + 本番ビルド

# その他
npm run lint         # ESLintチェック
npm run preview      # 本番ビルドのプレビュー
```

## 検証プロセス（必須）

**重要**: コミットやPRの前に、必ず以下を実行してください：

```bash
npm test && npm run build
```

- `npm test` はロジックの正確性を検証します
- `npm run build` はTypeScriptエラーをキャッチします（TSエラーはテストだけでは検出されません）

両方のコマンドがパスしてからコミットしてください。

## 理解すべき重要ファイル

| ファイル | 目的 |
|----------|------|
| `src/App.tsx` | メインアプリケーションオーケストレーター、シミュレーション制御 |
| `src/lib/MappingEngine.ts` | ETL変換エンジン（21種類以上の変換タイプ） |
| `src/lib/MappingTypes.ts` | すべてのETL操作の型定義 |
| `src/lib/hooks/useSimulationEngine.ts` | コアシミュレーションロジック |
| `src/lib/SettingsContext.tsx` | グローバル状態管理 |
| `src/components/settings/MappingDesigner.tsx` | ビジュアルETLデザイナー |
| `.specify/specs/` | 機能仕様 |

## ETL変換タイプ

MappingEngineは以下の変換をサポートしています：
- **基本**: Source, Target, Filter, Expression
- **集計**: Aggregator, Sorter, Rank, Sequence
- **結合**: Joiner, Lookup（キャッシュ付き）, Union
- **データ処理**: Router, Normalizer, Deduplicator, Pivot, Unpivot
- **高度**: SQL, WebService, HierarchyParser, Cleansing, UpdateStrategy

## コーディング規約

### TypeScript
- **Strictモード有効** - 暗黙のanyは禁止
- `any`型を避ける - 具体的な型またはジェネリクスを使用
- 型は`MappingTypes.ts`または`types.ts`で定義

### React
- フックを使用した関数コンポーネント
- グローバル状態にはContext APIを使用
- 分離のためコンポーネントをErrorBoundaryでラップ
- 複雑なロジックはカスタムフックに抽出

### コメント
- すべてのコードコメントは日本語で記述
- 既存の英語コメントは発見次第日本語に更新

### テスト
- テストファイルは`src/lib/`に配置
- Vitest + @testing-library/reactを使用
- コアロジック（MappingEngine, DataGenerator）には包括的なテストあり

## コミットメッセージ（Conventional Commits）

```
<type>(<scope>): <英語での説明>

<日本語での本文>
```

### タイプ
| タイプ | 説明 | バージョン影響 |
|--------|------|----------------|
| `feat` | 新機能 | マイナー (1.x.0) |
| `fix` | バグ修正 | パッチ (1.0.x) |
| `docs` | ドキュメントのみ | なし |
| `refactor` | コード再構築 | なし |
| `test` | テスト変更 | なし |
| `perf` | パフォーマンス改善 | パッチ |
| `chore` | ビルド/ツール変更 | なし |

### 破壊的変更
```
feat!: description

BREAKING CHANGE: 日本語での説明
```

## 開発ワークフロー

1. `main`からフィーチャーブランチを作成
2. 変更を実装
3. `npm test && npm run build`を実行（必須）
4. Conventional Commitsに従ってコミット
5. PRを作成
6. マージ後、semantic-releaseが自動的にバージョニングを処理

## アーキテクチャパターン

### 状態管理
- React Context API + useReducer
- `SettingsContext` - グローバルアプリケーション設定
- `JobMonitorContext` - ジョブ実行追跡
- `VirtualFileSystem` / `VirtualDB` - シミュレートされたストレージ

### コンポーネント設計
- UIコンポーネントとビジネスロジック（hooks/lib）の分離
- Propsドリブンの設定
- 障害分離のためのErrorBoundary

### ファイルシステムシミュレーション
- ホスト/パス階層を持つインメモリファイルシステム
- 並行アクセスのためのファイルロック
- マルチホスト構成をサポート

## 仕様システム（.specify/）

機能仕様は構造化されたフォーマットに従います：
- `spec.md` - 機能要件
- `tasks.md` - タスク分解
- `plan.md` - 実装計画
- `checklist.md` - 受け入れ基準

現在の仕様: 001（初期）から007（CDIルーター修正）

## 共通タスク

### 新しい変換タイプの追加
1. `MappingTypes.ts`に型定義を追加
2. `MappingEngine.ts`に実装
3. `MappingDesigner.tsx`にUIを追加
4. `MappingEngine.test.ts`にテストを記述

### 新しい設定パネルの追加
1. `src/components/settings/`にコンポーネントを作成
2. `SettingsPanel.tsx`に登録
3. `SettingsContext.tsx`に状態を追加
4. `validation.ts`にバリデーションを追加

### シミュレーションロジックの変更
1. コアロジックは`useSimulationEngine.ts`
2. タイマー制御は`useSimulationTimers.ts`
3. `npm test`で変更をテスト

## トラブルシューティング

### TSエラーでビルドが失敗する場合
- `npm run build`を実行して完全なエラー出力を確認
- よくある問題：未使用の変数、型の不一致
- コミット前にすべてのエラーを修正

### テストはパスするがビルドが失敗する場合
- テストはすべてのTypeScriptエラーをキャッチしません
- 常に`npm test`と`npm run build`の両方を実行

### ReactFlowレイアウトの問題
- `dagre`レイアウト設定を確認
- ProcessNode/StorageNodeのノードサイズを確認

## 追加ドキュメント

- `README.md` - ユーザードキュメント（日本語）
- `AGENTS.md` - AIエージェントガイドライン（詳細な日本語ルール）
- `CONTRIBUTING.md` - コントリビューションガイド
- `.specify/memory/constitution.md` - プロジェクト原則
