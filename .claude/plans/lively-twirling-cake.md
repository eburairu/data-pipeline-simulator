# TaskFlowとデータソース間のデータフロー接続可視化

## 概要

Pipeline Architecture Visualizer（PipelineFlow.tsx）において、TaskFlowとデータソース（テーブル、トピック、ファイル）間の入出力関係を可視化する。

## 現状の問題

- TaskFlowノードは含まれるMappingTaskへの「包含関係」（紫色破線）のみ表示
- TaskFlowレベルで、どのデータソースから入力し、どのターゲットに出力するかが不明

## 実装アプローチ: ハイブリッド方式

既存のTaskFlow→Task間エッジ（制御フロー）を維持しつつ、TaskFlow→データソース間エッジ（データフロー）を追加。

**エッジの視覚的区別:**
| 関係 | 色 | スタイル | ラベル |
|------|-----|---------|--------|
| TaskFlow→Task | 紫 (#6366f1) | 破線 | contains |
| TaskFlow←Source | インディゴ (#4f46e5) | 実線 | reads |
| TaskFlow→Target | インディゴ (#4f46e5) | 実線 | writes |

## 実装手順

### Step 1: データソース収集ヘルパー関数を追加

`PipelineFlow.tsx`の`useEffect`内に、TaskFlowが使用するSource/Targetを収集する関数を追加:

```typescript
// TaskFlowに含まれるすべてのタスクが使用するSource/Targetを収集
const getTaskFlowDataSources = (flow: TaskFlow) => {
  const sources = new Set<string>();
  const targets = new Set<string>();

  flow.taskIds.forEach(taskId => {
    const task = mappingTasks.find(t => t.id === taskId);
    if (!task?.enabled) return;

    const mapping = mappings.find(m => m.id === task.mappingId);
    if (!mapping) return;

    mapping.transformations.filter(t => t.type === 'source').forEach(src => {
      const conf = src.config as SourceConfig;
      const conn = connections.find(c => c.id === conf.connectionId);
      if (conn) sources.add(getConnectionKey(conn, conf.path, conf.tableName));
    });

    mapping.transformations.filter(t => t.type === 'target').forEach(tgt => {
      const conf = tgt.config as TargetConfig;
      const conn = connections.find(c => c.id === conf.connectionId);
      if (conn) targets.add(getConnectionKey(conn, conf.path, conf.tableName));
    });
  });

  return { sources, targets };
};
```

### Step 2: TaskFlow表示セクション（325-356行目）を拡張

TaskFlowノード作成後に、データソースへのエッジを追加:

```typescript
// NEW: TaskFlowからデータソースへの接続
const { sources, targets } = getTaskFlowDataSources(flow);

sources.forEach(sourceKey => {
  const storageNode = keyNodeMap.get(sourceKey);
  if (storageNode) {
    calculatedEdges.push({
      id: `e-flow-src-${flow.id}-${storageNode.id}`,
      source: storageNode.id,
      target: flowId,
      animated: false,
      style: { stroke: '#4f46e5', strokeWidth: 1.5 },
      label: 'reads'
    });
  }
});

targets.forEach(targetKey => {
  const storageNode = keyNodeMap.get(targetKey);
  if (storageNode) {
    calculatedEdges.push({
      id: `e-flow-tgt-${flow.id}-${storageNode.id}`,
      source: flowId,
      target: storageNode.id,
      animated: false,
      style: { stroke: '#4f46e5', strokeWidth: 1.5 },
      label: 'writes'
    });
  }
});
```

## 変更ファイル

- `src/components/PipelineFlow.tsx` - メイン実装（TaskFlow表示セクション拡張）

## 検証方法

1. `npm run dev` で開発サーバー起動
2. TaskFlowを作成し、複数のMappingTaskを追加
3. Pipeline Architecture Visualizerで以下を確認:
   - TaskFlowノードからSourceストレージへの「reads」エッジ
   - TaskFlowノードからTargetストレージへの「writes」エッジ
   - 既存のTaskFlow→Task間の紫色破線エッジが維持されている
4. `npm test && npm run build` でビルド検証
