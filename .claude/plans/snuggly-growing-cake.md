# 実装プラン: モニタータブ ビジュアライザー共通化 (018-visualizer-deduplication)

## Context

モニタータブのビジュアライザー関連コンポーネント（JobMonitor、PipelineFlow、BiDashboard、ノード/エッジ/ウィジェット）に、共通化されていない重複コードが多数存在する。同じステータス色定義、プログレスバー、ステータスバッジ、数値ウィジェット構造が各ファイルに散在しており、修正時に複数箇所を同時変更する必要がある保守性の問題がある。

**目的**: 重複を共通コンポーネント/ユーティリティに統合し、保守性と一貫性を向上させる（振る舞いは変えない純粋なリファクタリング）。

## 成果物

1. **SDD仕様書**: `.specify/specs/018-visualizer-deduplication/` に `spec.md` と `tasks.md` を作成
2. **実装**: 仕様書に従ったリファクタリング

---

## 発見された重複パターン（5件）

### 重複1: 数値ウィジェット4つがほぼ同一構造（~182行）
| ファイル | 差分 |
|---|---|
| `src/components/widgets/RecordCountWidget.tsx` | icon=Database, color=blue, unit="件", format=toLocaleString |
| `src/components/widgets/ThroughputWidget.tsx` | icon=Activity, color=green, unit="rec/s", format=toLocaleString |
| `src/components/widgets/ErrorRateWidget.tsx` | icon=AlertTriangle, color=orange, unit="%", format=toFixed(2), **条件付きvalueColor** |
| `src/components/widgets/ProcessingTimeWidget.tsx` | icon=Clock, color=purple, unit="ms", format=toLocaleString, **条件付きvalueColor** |

構造・レイアウト・changeDirection描画は100%同一。

### 重複2: MetricEdgeはFlowingEdgeの完全なサブセット（50行が不要）
- `src/components/FlowingEdge.tsx` (83行): アニメーション粒子 + メトリクスラベル
- `src/components/MetricEdge.tsx` (50行): メトリクスラベルのみ
- FlowingEdgeの`isAnimating=false`時 = MetricEdgeの全機能。ラベル描画コードは完全一致。

### 重複3: ステータスカラー/アイコンの分散定義（3ファイル）
- `ProcessNode.tsx:19-37` — `getStatusColor()`, `getStatusIcon()`
- `NodeDetailPanel.tsx:91-100` — インラインで同じステータス→色/アイコンマッピング
- `JobMonitor.tsx` — ステータスバッジ（モバイル/デスクトップで2回記述）

### 重複4: プログレスバーの重複実装（4箇所）
- `ProcessNode.tsx:93-100` — ランニング進捗バー (h-1.5, bg-orange-500)
- `StorageNode.tsx:64-69` — 容量バー (h-1.5, しきい値色変更, border付き)
- `NodeDetailPanel.tsx:105-113` — 進捗バー (h-2, ステータス色)
- `NodeDetailPanel.tsx:60-62` — 容量バー (h-1.5, bg-blue-500)

### 重複5: JobMonitor内のステータスバッジ重複（2箇所で同一コード）
- モバイルカードビュー (行250-262)
- デスクトップテーブルビュー (行356-368)
- 完全に同一の描画ロジック

---

## 対処方針

### A. `NumericWidget` 汎用数値ウィジェット（重複1を解消）
- **新規**: `src/components/widgets/NumericWidget.tsx`
- **変更**: `src/components/widgets/types.ts` に `icon`, `iconColorClass`, `valueColorFn` を追加
- 4つのウィジェットファイルは薄いラッパーに変換（外部インターフェース維持）
- ウィジェットレジストリ (`index.ts`) の登録は変更不要

### B. MetricEdge廃止（重複2を解消）
- **削除**: `src/components/MetricEdge.tsx`
- **変更**: `src/components/PipelineFlow.tsx` — edgeTypes.default を FlowingEdge に変更
- **変更**: `src/components/settings/mapping/DesignerNode.tsx` — edgeTypes.metric を FlowingEdge に変更

### C. `statusUtils.ts` ステータスユーティリティ（重複3を解消）
- **新規**: `src/lib/statusUtils.ts`
- NodeStatus型(`idle/running/success/error/warning`)とJobBadgeStatus型(`success/failed/running`)を分離定義
- `getNodeStatusColor()`, `getNodeStatusIcon()`, `getJobStatusBadge()` を提供
- **変更**: `ProcessNode.tsx`, `NodeDetailPanel.tsx`, `JobMonitor.tsx`

### D. `ProgressBar` 共通コンポーネント（重複4を解消）
- **新規**: `src/components/common/ProgressBar.tsx`
- `percent`, `colorClass`, `colorFn`(しきい値色変更用), `heightClass`, `bgClass` 等のprops
- **変更**: `ProcessNode.tsx`, `StorageNode.tsx`, `NodeDetailPanel.tsx`

### E. `StatusBadge` 共通コンポーネント（重複5を解消）
- **新規**: `src/components/common/StatusBadge.tsx`
- `statusUtils.ts` の `getJobStatusBadge()` を利用
- **変更**: `JobMonitor.tsx`（2箇所を1コンポーネント呼び出しに統一）

---

## ファイル変更一覧

| 操作 | ファイルパス |
|---|---|
| **新規** | `src/lib/statusUtils.ts` |
| **新規** | `src/components/common/ProgressBar.tsx` |
| **新規** | `src/components/common/StatusBadge.tsx` |
| **新規** | `src/components/widgets/NumericWidget.tsx` |
| **変更** | `src/components/widgets/types.ts` |
| **変更** | `src/components/widgets/RecordCountWidget.tsx` |
| **変更** | `src/components/widgets/ThroughputWidget.tsx` |
| **変更** | `src/components/widgets/ErrorRateWidget.tsx` |
| **変更** | `src/components/widgets/ProcessingTimeWidget.tsx` |
| **変更** | `src/components/PipelineFlow.tsx` |
| **変更** | `src/components/settings/mapping/DesignerNode.tsx` |
| **変更** | `src/components/nodes/ProcessNode.tsx` |
| **変更** | `src/components/nodes/StorageNode.tsx` |
| **変更** | `src/components/NodeDetailPanel.tsx` |
| **変更** | `src/components/JobMonitor.tsx` |
| **削除** | `src/components/MetricEdge.tsx` |
| **新規** | `.specify/specs/018-visualizer-deduplication/spec.md` |
| **新規** | `.specify/specs/018-visualizer-deduplication/tasks.md` |

---

## 今回の実施範囲

**SDD仕様書の作成のみ**（コード変更は行わない）

1. `.specify/specs/018-visualizer-deduplication/spec.md` を作成
2. `.specify/specs/018-visualizer-deduplication/tasks.md` を作成

---

## リスクと注意点

1. **MetricEdgeのz-10差分**: FlowingEdge統合後DesignerNode内のラベルにz-10が付くが軽微（ラベルが前面に出る正しい動作）
2. **NumericWidgetPropsの型拡張**: 全てoptionalフィールド追加のため破壊的変更なし
3. **ProgressBarのスタイル差分**: 4箇所で高さ・背景・ボーダーが微妙に異なる → `className` propで差分吸収
4. **NodeStatusとJobStatusの型の違い**: `statusUtils.ts`で2つの型を分離定義して対応

## 検証方法

```bash
npm test && npm run build
```

加えて以下を画面で目視確認:
- PipelineFlow: エッジ表示（アニメーション/メトリクスラベル）が正常か
- JobMonitor: ステータスバッジ表示（モバイル/デスクトップ両方）
- BiDashboard: 4種類の数値ウィジェットが正しく表示されるか
- NodeDetailPanel: ステータス色・プログレスバーの表示
