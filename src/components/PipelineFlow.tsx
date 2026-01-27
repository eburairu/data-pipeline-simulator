import React, { useEffect, useCallback, useState } from 'react';
import ReactFlow, { type Node, type Edge, Background, Controls, Panel, Position, useNodesState, useEdgesState, type ReactFlowInstance } from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { LayoutGrid } from 'lucide-react';
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
  const { dataSource, collection, delivery, etl, topics } = useSettings();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

  // 安全にカウントを取得するヘルパー
  const getCount = useCallback((host: string, path: string) => {
    try {
      return listFiles(host, path).length;
    } catch {
      return 0;
    }
  }, [listFiles]);

  useEffect(() => {
    const calculatedNodes: Node[] = [];
    const calculatedEdges: Edge[] = [];
    const keyNodeMap = new Map<string, Node>(); // キー (host:path) -> Node

    const getKey = (host: string, path: string) => `${host}:${path}`;
    const parseKey = (key: string) => {
        const sepIndex = key.indexOf(':');
        return {
            host: key.substring(0, sepIndex),
            path: key.substring(sepIndex + 1)
        };
    };

    const getLabel = (host: string, path: string) => {
        if (host === 'localhost' && path.startsWith('/topics/')) {
            const topicId = path.split('/')[2];
            const topic = topics.find(t => t.id === topicId);
            return topic ? `Topic: ${topic.name}` : `${host}:${path}`;
        }
        return `${host}:${path}`;
    };

    // --- 1. ユニークなパスを特定してストレージノードを作成 ---

    // 各「ステージ」のキーを収集
    // ステージ 0: データソースのキー
    const sourceKeys = Array.from(new Set(dataSource.definitions.map(d => getKey(d.host, d.path))));

    // ステージ 1: 受信キー (Collectionのターゲット) + Delivery Source Keys (Topics)
    const incomingKeysRaw = collection.jobs.map(j => {
        if (j.targetType === 'topic' && j.targetTopicId) {
            return getKey('localhost', `/topics/${j.targetTopicId}`);
        }
        return getKey(j.targetHost, j.targetPath);
    });

    delivery.jobs.forEach(j => {
        if (j.sourceType === 'topic' && j.sourceTopicId) {
            incomingKeysRaw.push(getKey('localhost', `/topics/${j.sourceTopicId}`));
        }
    });

    const incomingKeys = Array.from(new Set(incomingKeysRaw));

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
        data: { label: getLabel(host, path), type: 'fs', count: getCount(host, path) },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
      calculatedNodes.push(node);
      keyNodeMap.set(key, node);
      return node;
    };

    // ノードの配置
    // 列 1: ソース
    sourceKeys.forEach((key, i) => {
        const { host, path } = parseKey(key);
        addStorageNode(host, path, 1, i);
    });

    // 列 2: 受信
    let incomingRow = 0;
    incomingKeys.forEach((key) => {
        if (!keyNodeMap.has(key)) {
            const { host, path } = parseKey(key);
            addStorageNode(host, path, 2, incomingRow++);
        }
    });

    // 列 3: 内部
    let internalRow = 0;
    internalKeys.forEach((key) => {
        if (!keyNodeMap.has(key)) {
            const { host, path } = parseKey(key);
            addStorageNode(host, path, 3, internalRow++);
        }
    });

    // ETLソースパスが存在することを確認 (ない場合は列3の下部に配置)
    const etlKey = getKey(etl.sourceHost, etl.sourcePath);
    if (!keyNodeMap.has(etlKey)) {
        addStorageNode(etl.sourceHost, etl.sourcePath, 3, internalRow++);
    }


    // --- 2. プロセスノードとエッジの作成 ---

    // 0. 生成ジョブ (列 0)
    dataSource.jobs.forEach((job) => {
        if (!job.enabled) return;

        const def = dataSource.definitions.find(d => d.id === job.dataSourceId);
        if (!def) return;

        const targetKey = getKey(def.host, def.path);
        const targetNode = keyNodeMap.get(targetKey);

        if (!targetNode) return;

        const id = `process-gen-${job.id}`;
        const sameTargetJobs = dataSource.jobs.filter(j => j.dataSourceId === job.dataSourceId && j.enabled);
        const jobIndex = sameTargetJobs.findIndex(j => j.id === job.id);
        const yOffset = (jobIndex - (sameTargetJobs.length - 1) / 2) * 80;

        calculatedNodes.push({
            id,
            type: 'process',
            position: { x: targetNode.position.x - 250, y: targetNode.position.y + yOffset },
            data: { label: job.name, isProcessing: false },
        });

        calculatedEdges.push({ id: `e-${id}-${targetNode.id}`, source: id, target: targetNode.id, animated: true });
    });

    // 2つのストレージノード間にプロセスノードを追加するヘルパー
    const addProcessNode = (id: string, label: string, srcHost: string, srcPath: string, tgtHost: string, tgtPath: string, isProcessing: boolean, indexOffset: number) => {
        const srcKey = getKey(srcHost, srcPath);
        const tgtKey = getKey(tgtHost, tgtPath);

        const srcNode = keyNodeMap.get(srcKey);
        const tgtNode = keyNodeMap.get(tgtKey);

        if (!srcNode || !tgtNode) return;

        const mx = (srcNode.position.x + tgtNode.position.x) / 2;
        const my = (srcNode.position.y + tgtNode.position.y) / 2 + (indexOffset * 40) - 20;

        calculatedNodes.push({
            id,
            type: 'process',
            position: { x: mx, y: my },
            data: { label, isProcessing },
        });

        calculatedEdges.push({ id: `e-${srcNode.id}-${id}`, source: srcNode.id, target: id, animated: true });
        calculatedEdges.push({ id: `e-${id}-${tgtNode.id}`, source: id, target: tgtNode.id, animated: true });
    };

    // 収集ジョブ
    collection.jobs.forEach((job, i) => {
        if (!job.enabled) return;

        let targetHost = job.targetHost;
        let targetPath = job.targetPath;
        if (job.targetType === 'topic' && job.targetTopicId) {
            targetHost = 'localhost';
            targetPath = `/topics/${job.targetTopicId}`;
        }

        addProcessNode(
            `process-col-${job.id}`,
            job.name,
            job.sourceHost,
            job.sourcePath,
            targetHost,
            targetPath,
            activeSteps.includes(`transfer_1_${job.id}`),
            i % 3
        );
    });

    // 配信ジョブ
    delivery.jobs.forEach((job, i) => {
        if (!job.enabled) return;

        let sourceHost = job.sourceHost;
        let sourcePath = job.sourcePath;
        if (job.sourceType === 'topic' && job.sourceTopicId) {
            sourceHost = 'localhost';
            sourcePath = `/topics/${job.sourceTopicId}`;
        }

        addProcessNode(
            `process-del-${job.id}`,
            job.name,
            sourceHost,
            sourcePath,
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
         const startX = etlSourceNode.position.x + 300;
         const startY = etlSourceNode.position.y;

         calculatedNodes.push({
             id: etlId,
             type: 'process',
             position: { x: startX, y: startY },
             data: { label: 'ETL', isProcessing: activeSteps.includes('process_etl') }
         });
         calculatedEdges.push({ id: `e-${etlSourceNode.id}-${etlId}`, source: etlSourceNode.id, target: etlId, animated: true });

         // Raw DB
         const rawDbId = 'db-raw';
         calculatedNodes.push({
             id: rawDbId,
             type: 'storage',
             position: { x: startX + 200, y: startY },
             data: { label: etl.rawTableName, type: 'db', count: select(etl.rawTableName).length },
             sourcePosition: Position.Right,
             targetPosition: Position.Left
         });
         calculatedEdges.push({ id: `e-${etlId}-${rawDbId}`, source: etlId, target: rawDbId, animated: true });

         // 変換プロセス
         const transformId = 'process-transform';
         calculatedNodes.push({
             id: transformId,
             type: 'process',
             position: { x: startX + 400, y: startY },
             data: { label: 'Transform', isProcessing: activeSteps.includes('process_transform') }
         });
         calculatedEdges.push({ id: `e-${rawDbId}-${transformId}`, source: rawDbId, target: transformId, animated: true });

         // Summary DB
         const summaryDbId = 'db-summary';
         calculatedNodes.push({
             id: summaryDbId,
             type: 'storage',
             position: { x: startX + 600, y: startY },
             data: { label: etl.summaryTableName, type: 'db', count: select(etl.summaryTableName).length },
             targetPosition: Position.Left
         });
         calculatedEdges.push({ id: `e-${transformId}-${summaryDbId}`, source: transformId, target: summaryDbId, animated: true });
    }

    // Merge logic to preserve positions of existing nodes
    setNodes((prevNodes) => {
       const prevNodeMap = new Map(prevNodes.map(n => [n.id, n]));
       return calculatedNodes.map(n => {
         const prev = prevNodeMap.get(n.id);
         if (prev) {
             return {
                 ...n,
                 position: prev.position,
                 width: prev.width,
                 height: prev.height,
                 selected: prev.selected,
                 dragging: prev.dragging,
             };
         }
         return n;
       });
    });

    setEdges(calculatedEdges);

  }, [dataSource, collection, delivery, etl, topics, listFiles, select, activeSteps, getCount, setNodes, setEdges]);

  const onLayout = useCallback(() => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    const getWidth = (node: Node) => (node.type === 'storage' ? 220 : 100);
    const getHeight = (node: Node) => (node.type === 'storage' ? 120 : 100);

    dagreGraph.setGraph({ rankdir: 'LR' });

    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: getWidth(node), height: getHeight(node) });
    });

    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return {
        ...node,
        targetPosition: Position.Left,
        sourcePosition: Position.Right,
        width: getWidth(node),
        height: getHeight(node),
        // dagre returns center position, we need top left
        position: {
          x: nodeWithPosition.x - getWidth(node) / 2,
          y: nodeWithPosition.y - getHeight(node) / 2,
        },
      };
    });

    setNodes(layoutedNodes);

    if (rfInstance) {
      window.requestAnimationFrame(() => {
        rfInstance.fitView({ padding: 0.2, duration: 800 });
      });
    }
  }, [nodes, edges, setNodes, rfInstance]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onInit={setRfInstance}
        fitView
        attributionPosition="bottom-right"
      >
        <Background />
        <Controls />
        <Panel position="top-right">
          <button
            onClick={onLayout}
            className="flex items-center gap-2 bg-white px-3 py-2 rounded shadow border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700 cursor-pointer"
            title="Auto-align nodes"
          >
            <LayoutGrid size={16} />
            Align Layout
          </button>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default PipelineFlow;
