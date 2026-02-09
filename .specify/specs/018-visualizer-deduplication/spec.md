# 機能仕様書: モニタータブ ビジュアライザー共通化

**ID**: 018
**機能ブランチ**: `018-visualizer-deduplication`
**作成日**: 2026-02-10
**ステータス**: 未実装 (Not Started)
**入力**: コードベース分析による重複パターン特定

## 背景

012-ui-component-decomposition でコンポーネント分割が完了した後、モニタータブのビジュアライザー関連コンポーネント（JobMonitor、PipelineFlow、BiDashboard、ノード/エッジ/ウィジェット）に、共通化されていない重複コードが多数残存している。

具体的には以下の5つの重複パターンが特定された:

1. **数値ウィジェット4つがほぼ同一構造** (~182行): カード構造・レイアウト・changeDirection描画が100%同一で、アイコン・色・単位・フォーマットのみが異なる
2. **MetricEdgeがFlowingEdgeの完全なサブセット** (50行が不要): FlowingEdge の `isAnimating=false` 時の動作が MetricEdge の全機能と一致
3. **ステータスカラー/アイコンの分散定義** (3ファイル): ProcessNode、NodeDetailPanel、JobMonitor で同じステータス→色/アイコンマッピングを個別に実装
4. **プログレスバーの重複実装** (4箇所): ProcessNode、StorageNode、NodeDetailPanel で類似のプログレスバーを個別に記述
5. **JobMonitor内のステータスバッジ重複** (2箇所): モバイルカードビューとデスクトップテーブルビューで完全に同一の描画ロジック

これらの重複は修正時に複数箇所の同時変更を要し、保守性を低下させている。

## ユーザーシナリオとテスト

### ユーザーストーリー 1 - 数値ウィジェット統合 (優先度: P1)

開発者として、4つの数値ウィジェットの共通描画ロジックが1箇所に集約されていることで、ウィジェットのレイアウト変更を1ファイルの修正のみで完了できるようにしたい。

**この優先度の理由**: 最も重複行数が多く（~182行）、4ファイルにまたがるため集約効果が最大。

**受け入れシナリオ**:

1. **前提条件** BiDashboard表示中, **操作** 4種類の数値ウィジェットを確認, **期待結果** レイアウト・フォント・色・変化量表示が従来と完全に同一
2. **前提条件** ErrorRateWidget (値 > 5), **操作** エラー率を確認, **期待結果** 値の色が赤で表示される（条件付きvalueColor維持）
3. **前提条件** ProcessingTimeWidget (値 > 5000), **操作** 処理時間を確認, **期待結果** 値の色が赤で表示される（条件付きvalueColor維持）

---

### ユーザーストーリー 2 - MetricEdge廃止 (優先度: P1)

開発者として、MetricEdge が FlowingEdge に統合されていることで、エッジのメトリクスラベル表示を修正する際に1ファイルのみ変更すればよいようにしたい。

**この優先度の理由**: 50行の完全重複ファイルを削除でき、効果が明確。

**受け入れシナリオ**:

1. **前提条件** PipelineFlow表示中, **操作** アニメーションなしエッジのメトリクスラベルを確認, **期待結果** 従来と同一のラベル表示
2. **前提条件** PipelineFlow表示中, **操作** アニメーションありエッジを確認, **期待結果** 粒子アニメーション + メトリクスラベルが従来通り動作
3. **前提条件** MappingDesignerフロー表示中, **操作** エッジのメトリクス表示を確認, **期待結果** FlowingEdge経由で従来と同一表示

---

### ユーザーストーリー 3 - ステータスユーティリティ統合 (優先度: P2)

開発者として、ステータスの色・アイコン定義が1箇所にまとめられていることで、新しいステータス追加やテーマ変更を1ファイルの修正で完了できるようにしたい。

**この優先度の理由**: 3ファイルにまたがるステータス定義の分散は、不一致バグの原因になりやすい。

**受け入れシナリオ**:

1. **前提条件** PipelineFlow表示中, **操作** running状態のProcessNodeを確認, **期待結果** 従来と同一のオレンジ色 + アニメーションアイコン
2. **前提条件** NodeDetailPanel表示中, **操作** success/error/warning状態のノードを確認, **期待結果** 従来と同一の色・アイコン
3. **前提条件** JobMonitor表示中, **操作** success/failed/running状態のジョブを確認, **期待結果** 従来と同一のバッジ表示

---

### ユーザーストーリー 4 - プログレスバー共通化 (優先度: P2)

開発者として、プログレスバーの描画ロジックが共通コンポーネントに集約されていることで、バーのスタイル変更を1箇所の修正で反映できるようにしたい。

**この優先度の理由**: 4箇所の微妙なスタイル差分を維持しつつ共通化することで、一貫性が向上する。

**受け入れシナリオ**:

1. **前提条件** running状態のProcessNode, **操作** プログレスバーを確認, **期待結果** h-1.5のオレンジバーが従来通り表示
2. **前提条件** StorageNode, **操作** 使用率バーを確認, **期待結果** しきい値(70%/90%)に応じた色変更が従来通り動作
3. **前提条件** NodeDetailPanel, **操作** 進捗バーを確認, **期待結果** ステータス色に応じたh-2バーが従来通り表示

---

### ユーザーストーリー 5 - ステータスバッジ共通化 (優先度: P3)

開発者として、JobMonitor内のモバイル/デスクトップ両方のステータスバッジが1つのコンポーネントから生成されることで、バッジの修正漏れが発生しないようにしたい。

**この優先度の理由**: 同一ファイル内の重複であるため影響範囲が限定的。

**受け入れシナリオ**:

1. **前提条件** JobMonitor（モバイル表示）, **操作** ステータスバッジを確認, **期待結果** 従来と同一の色・アイコン・テキスト
2. **前提条件** JobMonitor（デスクトップ表示）, **操作** ステータスバッジを確認, **期待結果** モバイルと完全に同一の表示

---

### エッジケース

- FlowingEdge統合後、DesignerNode内のラベルにz-10が追加されるが、ラベルが前面に出る正しい動作であり許容範囲
- ProgressBarの4箇所の高さ・背景・ボーダー差分は `className` prop で差分吸収
- NodeStatus型（idle/running/success/error/warning）と JobBadgeStatus型（success/failed/running）は異なる型として分離定義

## 要件

### 機能要件

- **FR-001**: 4つの数値ウィジェット（RecordCount, Throughput, ErrorRate, ProcessingTime）の共通描画ロジックを `NumericWidget` コンポーネントに集約しなければならない
- **FR-002**: 各ウィジェットファイルは `NumericWidget` を利用する薄いラッパーとして維持し、外部インターフェースを変更してはならない
- **FR-003**: `MetricEdge.tsx` を削除し、すべての参照箇所を `FlowingEdge` に置き換えなければならない
- **FR-004**: ステータスの色・アイコンマッピングを `statusUtils.ts` に集約し、ProcessNode・NodeDetailPanel・JobMonitor から参照しなければならない
- **FR-005**: プログレスバーの共通描画ロジックを `ProgressBar` コンポーネントに集約しなければならない
- **FR-006**: JobMonitor内のモバイル/デスクトップのステータスバッジを `StatusBadge` コンポーネントに統合しなければならない
- **FR-007**: すべての変更は純粋なリファクタリングであり、ユーザーから見た振る舞いを変更してはならない

### 主要エンティティ

- **NumericWidget**: 数値ウィジェットの共通描画コンポーネント（アイコン・色・単位・フォーマット・条件付きvalueColorをpropsで受け取る）
- **ProgressBar**: プログレスバーの共通コンポーネント（percent, colorClass, heightClass, className等をpropsで受け取る）
- **StatusBadge**: ジョブステータスバッジの共通コンポーネント（statusUtils.tsのgetJobStatusBadge()を利用）
- **statusUtils**: ノードステータスとジョブステータスのカラー/アイコンマッピングユーティリティ

## 成功基準

### 測定可能なアウトカム

- **SC-001**: `MetricEdge.tsx` が削除されていること
- **SC-002**: 4つの数値ウィジェットの共通描画コードが `NumericWidget.tsx` に集約されていること
- **SC-003**: ステータス色・アイコンの定義箇所が `statusUtils.ts` の1ファイルのみであること
- **SC-004**: JobMonitor内のステータスバッジ描画コードが1箇所のみであること
- **SC-005**: すべての既存テストがパスすること（`npm test`）
- **SC-006**: TypeScriptビルドがエラーなく完了すること（`npm run build`）
- **SC-007**: PipelineFlow・JobMonitor・BiDashboard・NodeDetailPanelの画面表示が従来と同一であること

## 技術的考慮事項

### 新規ファイル構造

```
src/
├── lib/
│   └── statusUtils.ts              # ステータスカラー/アイコンユーティリティ
├── components/
│   ├── common/
│   │   ├── ProgressBar.tsx          # 共通プログレスバー
│   │   └── StatusBadge.tsx          # 共通ステータスバッジ
│   └── widgets/
│       └── NumericWidget.tsx        # 共通数値ウィジェット
```

### statusUtils.ts の設計

```typescript
// ノードステータス用（ProcessNode, NodeDetailPanel）
type NodeStatus = 'idle' | 'running' | 'success' | 'error' | 'warning';

function getNodeStatusColor(status: NodeStatus): string;
function getNodeStatusIcon(status: NodeStatus): React.ReactNode;

// ジョブステータス用（JobMonitor）
type JobBadgeStatus = 'success' | 'failed' | 'running';

interface JobBadgeConfig {
  bgColor: string;
  textColor: string;
  icon: React.ReactNode;
  label: string;
}

function getJobStatusBadge(status: string): JobBadgeConfig;
```

### NumericWidget の設計

```typescript
import { LucideIcon } from 'lucide-react';

interface NumericWidgetInternalProps extends NumericWidgetProps {
  icon: LucideIcon;
  iconColorClass: string;
  valueColorFn?: (value: number) => string;
}
```

- 4つのウィジェットファイルは `NumericWidget` に固有のpropsを渡す薄いラッパーに変換
- ウィジェットレジストリ (`widgets/index.ts`) の登録は変更不要

### ProgressBar の設計

```typescript
interface ProgressBarProps {
  percent: number;
  colorClass?: string;
  colorFn?: (percent: number) => string;
  heightClass?: string;
  bgClass?: string;
  className?: string;
}
```

- 各利用箇所のスタイル差分は props で吸収
- StorageNode のしきい値色変更は `colorFn` で対応

### MetricEdge 廃止の影響

| 参照箇所 | 変更内容 |
|---|---|
| `PipelineFlow.tsx` | edgeTypes.default を FlowingEdge に変更 |
| `DesignerNode.tsx` | edgeTypes.metric を FlowingEdge に変更、MetricEdge import を削除 |

FlowingEdge の `isAnimating=false` 時（デフォルト）= MetricEdge の全機能。ラベル描画コードは完全一致。

### リスクと軽減策

| リスク | 影響 | 軽減策 |
|---|---|---|
| FlowingEdge統合後のDesignerNode内z-10 | 低 | ラベルが前面に出る正しい動作であり許容 |
| ProgressBarの4箇所のスタイル差分 | 低 | className propで差分吸収 |
| NodeStatusとJobStatusの型の違い | 中 | statusUtils.tsで2つの型を分離定義 |
