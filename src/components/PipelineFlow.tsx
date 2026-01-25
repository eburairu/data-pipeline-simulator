import React, { useMemo } from 'react';
import ReactFlow, { type Node, type Edge, Background, Controls, Position } from 'reactflow';
import 'reactflow/dist/style.css';
import { useFileSystem } from '../lib/VirtualFileSystem';
import { useVirtualDB } from '../lib/VirtualDB';
import { useSettings } from '../lib/SettingsContext';
import StorageNode from './nodes/StorageNode';
import ProcessNode from './nodes/ProcessNode';

const nodeTypes = {
  storage: StorageNode,
  process: ProcessNode,
};

interface PipelineFlowProps {
  activeSteps?: string[];
}

const PipelineFlow: React.FC<PipelineFlowProps> = ({ activeSteps = [] }) => {
  const { listFiles } = useFileSystem();
  const { select } = useVirtualDB();
  const { dataSource, collection, delivery, etl } = useSettings();

  // 安全にカウントを取得するヘルパー
  const getCount = (host: string, path: string) => {
    try {
      return listFiles(host, path).length;
    } catch {
      return 0;
    }
  };

  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const keyNodeMap = new Map<string, Node>(); // キー (host:path) -> Node

    const getKey = (host: string, path: string) => `${host}:${path}`;
    const parseKey = (key: string) => {
        const sepIndex = key.indexOf(':');
        return {
            host: key.substring(0, sepIndex),
            path: key.substring(sepIndex + 1)
        };
    };

    // --- 1. ユニークなパスを特定してストレージノードを作成 ---

    // 各「ステージ」のキーを収集
    // ステージ 0: データソースのキー
    const sourceKeys = Array.from(new Set(dataSource.jobs.map(j => getKey(j.host, j.sourcePath))));

    // ステージ 1: 受信キー (Collectionのターゲット)
    const incomingKeys = Array.from(new Set(collection.jobs.map(j => getKey(j.targetHost, j.targetPath))));

    // ステージ 2: 内部キー (Deliveryのターゲット)
    const internalKeys = Array.from(new Set(delivery.jobs.map(j => getKey(j.targetHost, j.targetPath))));

    const addStorageNode = (host: string, path: string, colIndex: number, rowIndex: number) => {
      const key = getKey(host, path);
      if (keyNodeMap.has(key)) return keyNodeMap.get(key)!;

      const id = `storage-${key.replace(/[^a-zA-Z0-9-_]/g, '_')}`;
      const node: Node = {
        id,
        type: 'storage',
        // レイアウト: 列に基づいてX、行に基づいてY
        position: { x: 50 + colIndex * 300, y: 50 + rowIndex * 150 },
        data: { label: key, type: 'fs', count: getCount(host, path) },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
      nodes.push(node);
      keyNodeMap.set(key, node);
      return node;
    };

    // ノードの配置
    // 列 0: ソース
    sourceKeys.forEach((key, i) => {
        const { host, path } = parseKey(key);
        addStorageNode(host, path, 0, i);
    });

    // 列 1: 受信
    let incomingRow = 0;
    incomingKeys.forEach((key) => {
        if (!keyNodeMap.has(key)) {
            const { host, path } = parseKey(key);
            addStorageNode(host, path, 1, incomingRow++);
        }
    });

    // 列 2: 内部
    let internalRow = 0;
    internalKeys.forEach((key) => {
        if (!keyNodeMap.has(key)) {
            const { host, path } = parseKey(key);
            addStorageNode(host, path, 2, internalRow++);
        }
    });

    // ETLソースパスが存在することを確認 (ない場合は列2の下部に配置)
    const etlKey = getKey(etl.sourceHost, etl.sourcePath);
    if (!keyNodeMap.has(etlKey)) {
        addStorageNode(etl.sourceHost, etl.sourcePath, 2, internalRow++);
    }


    // --- 2. プロセスノードとエッジの作成 ---

    // 2つのストレージノード間にプロセスノードを追加するヘルパー
    const addProcessNode = (id: string, label: string, srcHost: string, srcPath: string, tgtHost: string, tgtPath: string, isProcessing: boolean, indexOffset: number) => {
        const srcKey = getKey(srcHost, srcPath);
        const tgtKey = getKey(tgtHost, tgtPath);

        const srcNode = keyNodeMap.get(srcKey);
        const tgtNode = keyNodeMap.get(tgtKey);

        if (!srcNode || !tgtNode) return;

        // 中間位置を計算
        // srcとtgtが同じ場合、またはtgtがsrcの「後ろ」にある場合、表示がおかしくなる可能性があります。
        // 基本的に左から右へのフローを想定しています。
        const mx = (srcNode.position.x + tgtNode.position.x) / 2;

        // 重複するジョブラインを分離するためにYを少しずらす
        // 複数のジョブが同じノード、または近いノードを接続する場合、それらを分離したい。
        // 単純なヒューリスティック: 平均Y + ジョブインデックスに基づくオフセット。
        const my = (srcNode.position.y + tgtNode.position.y) / 2 + (indexOffset * 40) - 20;

        nodes.push({
            id,
            type: 'process',
            position: { x: mx, y: my },
            data: { label, isProcessing },
        });

        edges.push({ id: `e-${srcNode.id}-${id}`, source: srcNode.id, target: id, animated: true });
        edges.push({ id: `e-${id}-${tgtNode.id}`, source: id, target: tgtNode.id, animated: true });
    };

    // 収集ジョブ
    collection.jobs.forEach((job, i) => {
        if (!job.enabled) return;
        addProcessNode(
            `process-col-${job.id}`,
            job.name,
            job.sourceHost,
            job.sourcePath,
            job.targetHost,
            job.targetPath,
            activeSteps.includes(`transfer_1_${job.id}`),
            i % 3 // わずかなジッターサイクル
        );
    });

    // 配信ジョブ
    delivery.jobs.forEach((job, i) => {
        if (!job.enabled) return;
        addProcessNode(
            `process-del-${job.id}`,
            job.name,
            job.sourceHost,
            job.sourcePath,
            job.targetHost,
            job.targetPath,
            activeSteps.includes(`transfer_2_${job.id}`),
            i % 3
        );
    });

    // --- 3. ETLチェーン ---
    const etlSourceNode = keyNodeMap.get(etlKey);
    if (etlSourceNode) {
         // ETLプロセスノード
         const etlId = 'process-etl';
         // ソースノードの右側に配置
         const startX = etlSourceNode.position.x + 300;
         const startY = etlSourceNode.position.y;

         nodes.push({
             id: etlId,
             type: 'process',
             position: { x: startX, y: startY },
             data: { label: 'ETL', isProcessing: activeSteps.includes('process_etl') }
         });
         edges.push({ id: `e-${etlSourceNode.id}-${etlId}`, source: etlSourceNode.id, target: etlId, animated: true });

         // Raw DB
         const rawDbId = 'db-raw';
         nodes.push({
             id: rawDbId,
             type: 'storage',
             position: { x: startX + 200, y: startY },
             data: { label: etl.rawTableName, type: 'db', count: select(etl.rawTableName).length },
             sourcePosition: Position.Right,
             targetPosition: Position.Left
         });
         edges.push({ id: `e-${etlId}-${rawDbId}`, source: etlId, target: rawDbId, animated: true });

         // 変換プロセス
         const transformId = 'process-transform';
         nodes.push({
             id: transformId,
             type: 'process',
             position: { x: startX + 400, y: startY },
             data: { label: 'Transform', isProcessing: activeSteps.includes('process_transform') }
         });
         edges.push({ id: `e-${rawDbId}-${transformId}`, source: rawDbId, target: transformId, animated: true });

         // Summary DB
         const summaryDbId = 'db-summary';
         nodes.push({
             id: summaryDbId,
             type: 'storage',
             position: { x: startX + 600, y: startY },
             data: { label: etl.summaryTableName, type: 'db', count: select(etl.summaryTableName).length },
             targetPosition: Position.Left
         });
         edges.push({ id: `e-${transformId}-${summaryDbId}`, source: transformId, target: summaryDbId, animated: true });
    }

    return { nodes, edges };
  }, [dataSource, collection, delivery, etl, listFiles, select, activeSteps]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default PipelineFlow;
