# 実装計画: 005-system-refactoring

**ブランチ**: `feature/system-refactoring` | **日付**: 2026-02-02 | **仕様書**: [.specify/specs/005-system-refactoring/spec.md](.specify/specs/005-system-refactoring/spec.md)
**入力**: `.specify/specs/005-system-refactoring/spec.md` からの機能仕様書

## 概要

このリファクタリングイニシアチブは、`data-pipeline-simulator` プロジェクトで特定された技術的負債を排除することを目的としています。主な焦点は、厳格な型安全のための「Zero any ポリシー」の施行、`App.tsx` からの複雑なシミュレーションロジックのカスタムフック（`useSimulationEngine`、`useSimulationTimers`）への抽出、およびReactレンダリングパフォーマンスとコンポーネントのモジュール性の向上です。

## 技術コンテキスト

**言語/バージョン**: TypeScript 5.x
**主要な依存関係**: React 18, Vite
**ストレージ**: LocalStorage（VirtualFileSystem/VirtualDB経由）
**テスト**: Vitest, React Testing Library
**ターゲットプラットフォーム**: Webブラウザ（SPA）
**プロジェクトタイプ**: シングルページアプリケーション（Web）
**パフォーマンス目標**: スムーズなシミュレーション更新（60fps UI）、大量データバッチの効率的な処理。
**制約条件**: リファクタリング中も既存機能を維持する必要がある。
**スケール/スコープ**: 約30のコアファイル、解決すべき約110の'any'型。

## 憲章チェック

*ゲート: フェーズ0の調査前に合格が必要。フェーズ1の設計後に再チェック。*

- **複雑さ**: リファクタリングはロジックをUIから分離することで複雑さを軽減。
- **依存関係**: 新しい主要な依存関係は導入されない。
- **標準**: 厳格なTypeScriptの使用を施行。

## プロジェクト構造

### ドキュメント（この機能用）

```text
.specify/specs/005-system-refactoring/
├── plan.md              # このファイル
├── spec.md              # 入力仕様書
└── tasks.md             # タスクリスト
```

### ソースコード（リポジトリルート）

```text
src/
├── App.tsx                    # 簡素化対象
├── components/
│   ├── common/                # 共有UIコンポーネント（新規/リファクタリング）
│   ├── views/                 # ページ/ビューコンポーネント用の新ディレクトリ（例: DatabaseView）
│   └── ...
├── lib/
│   ├── hooks/                 # ロジック抽出ターゲット
│   │   ├── useSimulationEngine.ts
│   │   └── useSimulationTimers.ts
│   ├── types.ts               # コア型定義
│   ├── MappingTypes.ts        # マッピング固有の型
│   ├── SettingsContext.tsx    # コンテキストリファクタリングターゲット
│   └── MappingEngine.ts       # ロジックリファクタリングターゲット
└── ...
```

**構造の決定**: 既存のVite/React構造を維持しつつ、ロジックを `hooks/` に、サブコンポーネントを `components/` に移動することで、より良い関心の分離を施行。

## 複雑さの追跡

| 違反 | 必要な理由 | より単純な代替案を却下した理由 |
|------|-----------|------------------------------|
| (なし) | | |
