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

  // Helper for safe counts
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
    const keyNodeMap = new Map<string, Node>(); // key (host:path) -> Node

    const getKey = (host: string, path: string) => `${host}:${path}`;
    const parseKey = (key: string) => {
        const sepIndex = key.indexOf(':');
        return {
            host: key.substring(0, sepIndex),
            path: key.substring(sepIndex + 1)
        };
    };

    // --- 1. Identify Unique Paths & Create Storage Nodes ---

    // Collect keys for each "Stage"
    // Stage 0: Data Source Keys
    const sourceKeys = Array.from(new Set(dataSource.jobs.map(j => getKey(j.host, j.sourcePath))));

    // Stage 1: Incoming Keys (Targets of Collection)
    const incomingKeys = Array.from(new Set(collection.jobs.map(j => getKey(j.targetHost, j.targetPath))));

    // Stage 2: Internal Keys (Targets of Delivery)
    const internalKeys = Array.from(new Set(delivery.jobs.map(j => getKey(j.targetHost, j.targetPath))));

    const addStorageNode = (host: string, path: string, colIndex: number, rowIndex: number) => {
      const key = getKey(host, path);
      if (keyNodeMap.has(key)) return keyNodeMap.get(key)!;

      const id = `storage-${key.replace(/[^a-zA-Z0-9-_]/g, '_')}`;
      const node: Node = {
        id,
        type: 'storage',
        // Layout: X based on col, Y based on row
        position: { x: 50 + colIndex * 300, y: 50 + rowIndex * 150 },
        data: { label: key, type: 'fs', count: getCount(host, path) },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
      nodes.push(node);
      keyNodeMap.set(key, node);
      return node;
    };

    // Place Nodes
    // Col 0: Sources
    sourceKeys.forEach((key, i) => {
        const { host, path } = parseKey(key);
        addStorageNode(host, path, 0, i);
    });

    // Col 1: Incoming
    let incomingRow = 0;
    incomingKeys.forEach((key) => {
        if (!keyNodeMap.has(key)) {
            const { host, path } = parseKey(key);
            addStorageNode(host, path, 1, incomingRow++);
        }
    });

    // Col 2: Internal
    let internalRow = 0;
    internalKeys.forEach((key) => {
        if (!keyNodeMap.has(key)) {
            const { host, path } = parseKey(key);
            addStorageNode(host, path, 2, internalRow++);
        }
    });

    // Ensure ETL source path exists (put in Col 2 if missing, at bottom)
    const etlKey = getKey(etl.sourceHost, etl.sourcePath);
    if (!keyNodeMap.has(etlKey)) {
        addStorageNode(etl.sourceHost, etl.sourcePath, 2, internalRow++);
    }


    // --- 2. Create Process Nodes & Edges ---

    // Helper to add process node between two storage nodes
    const addProcessNode = (id: string, label: string, srcHost: string, srcPath: string, tgtHost: string, tgtPath: string, isProcessing: boolean, indexOffset: number) => {
        const srcKey = getKey(srcHost, srcPath);
        const tgtKey = getKey(tgtHost, tgtPath);

        const srcNode = keyNodeMap.get(srcKey);
        const tgtNode = keyNodeMap.get(tgtKey);

        if (!srcNode || !tgtNode) return;

        // Calculate mid position
        // If src and tgt are same, or tgt is "behind" src, visual might be weird.
        // Assuming flow left-to-right mostly.
        const mx = (srcNode.position.x + tgtNode.position.x) / 2;

        // Jitter Y to separate overlapping job lines
        // If multiple jobs connect same nodes, or close nodes, we want to separate them.
        // Simple heuristic: average Y + offset based on job index.
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

    // Collection Jobs
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
            i % 3 // slight jitter cycle
        );
    });

    // Delivery Jobs
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

    // --- 3. ETL Chain ---
    const etlSourceNode = keyNodeMap.get(etlKey);
    if (etlSourceNode) {
         // ETL Process Node
         const etlId = 'process-etl';
         // Place to the right of the source node
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

         // Transform Process
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
