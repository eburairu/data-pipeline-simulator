import React, { useEffect, useCallback, useState } from 'react';
import ReactFlow, { type Node, type Edge, Background, Controls, Panel, Position, useNodesState, useEdgesState, type ReactFlowInstance } from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { LayoutGrid } from 'lucide-react';
import { useFileSystem } from '../lib/VirtualFileSystem';
import { useVirtualDB } from '../lib/VirtualDB';
import { useSettings, type ConnectionDefinition } from '../lib/SettingsContext';
import { type SourceConfig, type TargetConfig } from '../lib/MappingTypes';
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
  const { dataSource, collection, delivery, etl, topics, mappings, mappingTasks, connections } = useSettings();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

  const getCount = useCallback((conn: ConnectionDefinition) => {
    try {
      if (conn.type === 'file') {
        return listFiles(conn.host!, conn.path!).length;
      } else if (conn.type === 'database') {
        return select(conn.tableName!).length;
      }
      return 0;
    } catch {
      return 0;
    }
  }, [listFiles, select]);

  // Legacy helper for host/path based counting
  const getLegacyCount = useCallback((host: string, path: string) => {
    try {
      return listFiles(host, path).length;
    } catch {
      return 0;
    }
  }, [listFiles]);

  useEffect(() => {
    const calculatedNodes: Node[] = [];
    const calculatedEdges: Edge[] = [];
    const keyNodeMap = new Map<string, Node>();

    // Helper to generate keys
    const getLegacyKey = (host: string, path: string) => `legacy:${host}:${path}`;
    const getConnectionKey = (conn: ConnectionDefinition) => {
      if (conn.type === 'file') return `legacy:${conn.host}:${conn.path}`; // Reuse legacy format to merge nodes
      return `db:${conn.tableName}`;
    };

    const addLegacyStorageNode = (host: string, path: string, colIndex: number, rowIndex: number) => {
      const key = getLegacyKey(host, path);
      if (keyNodeMap.has(key)) return keyNodeMap.get(key)!;

      let label = `${host}:${path}`;
      if (host === 'localhost' && path.startsWith('/topics/')) {
        const topicId = path.split('/')[2];
        const topic = topics.find(t => t.id === topicId);
        if (topic) label = `Topic: ${topic.name}`;
      }

      const id = `storage-${key.replace(/[^a-zA-Z0-9-_]/g, '_')}`;
      const node: Node = {
        id,
        type: 'storage',
        position: { x: 50 + colIndex * 300, y: 50 + rowIndex * 150 },
        data: { label, type: 'fs', count: getLegacyCount(host, path) },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
      calculatedNodes.push(node);
      keyNodeMap.set(key, node);
      return node;
    };

    const addConnectionStorageNode = (conn: ConnectionDefinition, colIndex: number = 0, rowIndex: number = 0) => {
      const key = getConnectionKey(conn);
      if (keyNodeMap.has(key)) return keyNodeMap.get(key)!;

      const id = `storage-${key.replace(/[^a-zA-Z0-9-_]/g, '_')}`;
      const node: Node = {
        id,
        type: 'storage',
        position: { x: 50 + colIndex * 300, y: 50 + rowIndex * 150 },
        data: {
          label: conn.type === 'database' ? `DB: ${conn.tableName}` : `${conn.host}:${conn.path}`,
          type: conn.type === 'database' ? 'db' : 'fs',
          count: getCount(conn)
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
      calculatedNodes.push(node);
      keyNodeMap.set(key, node);
      return node;
    };


    // --- 1. Render Legacy Pipeline (Data Source, Collection, Delivery) ---
    // (Keeping this for compatibility with existing UI)

    const sourceKeys = Array.from(new Set(dataSource.definitions.map(d => getLegacyKey(d.host, d.path))));
    sourceKeys.forEach((key, i) => {
      const parts = key.split(':');
      addLegacyStorageNode(parts[1], parts[2], 1, i);
    });

    // Collection/Delivery targets
    const otherKeys = new Set<string>();
    collection.jobs.forEach(j => {
      if (j.targetType === 'topic' && j.targetTopicId) {
          otherKeys.add(getLegacyKey('localhost', `/topics/${j.targetTopicId}`));
      } else if (j.targetConnectionId) {
          const conn = connections.find(c => c.id === j.targetConnectionId);
          if (conn && conn.type === 'file' && conn.host && conn.path) {
              otherKeys.add(getLegacyKey(conn.host, conn.path));
          }
      }
    });
    delivery.jobs.forEach(j => {
      if (j.targetConnectionId) {
          const conn = connections.find(c => c.id === j.targetConnectionId);
          if (conn && conn.type === 'file' && conn.host && conn.path) {
              otherKeys.add(getLegacyKey(conn.host, conn.path));
          }
      }
    });

    let rowIndex = 0;
    otherKeys.forEach(key => {
      const parts = key.split(':');
      if (!keyNodeMap.has(key)) {
        addLegacyStorageNode(parts[1], parts[2], 2, rowIndex++);
      }
    });

    // Legacy Process Nodes
    dataSource.jobs.forEach((job) => {
      if (!job.enabled) return;
      const def = dataSource.definitions.find(d => d.id === job.dataSourceId);
      if (!def) return;
      const targetNode = keyNodeMap.get(getLegacyKey(def.host, def.path));
      if (!targetNode) return;

      const id = `process-gen-${job.id}`;
      calculatedNodes.push({
        id, type: 'process',
        position: { x: targetNode.position.x - 250, y: targetNode.position.y },
        data: { label: job.name, isProcessing: false },
      });
      calculatedEdges.push({ id: `e-${id}-${targetNode.id}`, source: id, target: targetNode.id, animated: true });
    });

    collection.jobs.forEach((job) => {
      if (!job.enabled) return;
      let targetHost = '', targetPath = '';
      if (job.targetType === 'topic' && job.targetTopicId) {
          targetHost = 'localhost'; targetPath = `/topics/${job.targetTopicId}`;
      } else {
          const conn = connections.find(c => c.id === job.targetConnectionId);
          if (conn && conn.type === 'file') { targetHost = conn.host!; targetPath = conn.path!; }
      }

      let sourceHost = '', sourcePath = '';
      const srcConn = connections.find(c => c.id === job.sourceConnectionId);
      if (srcConn && srcConn.type === 'file') { sourceHost = srcConn.host!; sourcePath = srcConn.path!; }

      const srcNode = keyNodeMap.get(getLegacyKey(sourceHost, sourcePath));
      const tgtNode = keyNodeMap.get(getLegacyKey(targetHost, targetPath));
      if (srcNode && tgtNode) {
        const id = `process-col-${job.id}`;
        calculatedNodes.push({
          id, type: 'process',
          position: { x: (srcNode.position.x + tgtNode.position.x) / 2, y: (srcNode.position.y + tgtNode.position.y) / 2 },
          data: { label: job.name, isProcessing: activeSteps.includes(`transfer_1_${job.id}`) }
        });
        calculatedEdges.push({ id: `e-${srcNode.id}-${id}`, source: srcNode.id, target: id, animated: true });
        calculatedEdges.push({ id: `e-${id}-${tgtNode.id}`, source: id, target: tgtNode.id, animated: true });
      }
    });

    delivery.jobs.forEach((job) => {
      if (!job.enabled) return;
      let sourceHost = '', sourcePath = '';
      if (job.sourceType === 'topic' && job.sourceTopicId) {
          sourceHost = 'localhost'; sourcePath = `/topics/${job.sourceTopicId}`;
      } else {
          const conn = connections.find(c => c.id === job.sourceConnectionId);
          if (conn && conn.type === 'file') { sourceHost = conn.host!; sourcePath = conn.path!; }
      }

      let targetHost = '', targetPath = '';
      const tgtConn = connections.find(c => c.id === job.targetConnectionId);
      if (tgtConn && tgtConn.type === 'file') { targetHost = tgtConn.host!; targetPath = tgtConn.path!; }

      const srcNode = keyNodeMap.get(getLegacyKey(sourceHost, sourcePath));
      const tgtNode = keyNodeMap.get(getLegacyKey(targetHost, targetPath));
      if (srcNode && tgtNode) {
        const id = `process-del-${job.id}`;
        calculatedNodes.push({
          id, type: 'process',
          position: { x: (srcNode.position.x + tgtNode.position.x) / 2, y: (srcNode.position.y + tgtNode.position.y) / 2 },
          data: { label: job.name, isProcessing: activeSteps.includes(`transfer_2_${job.id}`) }
        });
        calculatedEdges.push({ id: `e-${srcNode.id}-${id}`, source: srcNode.id, target: id, animated: true });
        calculatedEdges.push({ id: `e-${id}-${tgtNode.id}`, source: id, target: tgtNode.id, animated: true });
      }
    });


    // --- 2. Render Mapping Tasks ---

    // We try to place them to the right of existing nodes if possible, or new rows.
    let taskRowIndex = 0;
    const TASK_START_X = 600; // Start placing mapping stuff further right?

    mappingTasks.forEach(task => {
      if (!task.enabled) return;
      const mapping = mappings.find(m => m.id === task.mappingId);
      if (!mapping) return;

      const taskId = `process-task-${task.id}`;

      // Find Connections
      const sources = mapping.transformations.filter(t => t.type === 'source');
      const targets = mapping.transformations.filter(t => t.type === 'target');

      const sourceNodes: Node[] = [];
      const targetNodes: Node[] = [];

      sources.forEach(src => {
        const conf = src.config as SourceConfig;
        const conn = connections.find(c => c.id === conf.connectionId);
        if (conn) {
          // Determine layout hint: if it's a file connection that might already exist from legacy, it will be reused.
          // If it's a DB, it's new.
          const node = addConnectionStorageNode(conn, 3, taskRowIndex);
          sourceNodes.push(node);
        }
      });

      targets.forEach(tgt => {
        const conf = tgt.config as TargetConfig;
        const conn = connections.find(c => c.id === conf.connectionId);
        if (conn) {
          const node = addConnectionStorageNode(conn, 5, taskRowIndex);
          targetNodes.push(node);
        }
      });

      // Place Task Node
      // Average Y of inputs and outputs
      const allConnectedNodes = [...sourceNodes, ...targetNodes];
      let avgY = 0;
      if (allConnectedNodes.length > 0) {
        avgY = allConnectedNodes.reduce((sum, n) => sum + n.position.y, 0) / allConnectedNodes.length;
      } else {
        avgY = 50 + taskRowIndex * 150;
      }

      // If we reused nodes, avgY might be weird. Let's just create the task node and let Dagre fix layout.
      calculatedNodes.push({
        id: taskId,
        type: 'process',
        position: { x: TASK_START_X + 200, y: avgY },
        data: { label: task.name, isProcessing: activeSteps.includes(`mapping_task_${task.id}`) }
      });

      // Edges
      sourceNodes.forEach(src => {
        calculatedEdges.push({ id: `e-${src.id}-${taskId}`, source: src.id, target: taskId, animated: true });
      });
      targetNodes.forEach(tgt => {
        calculatedEdges.push({ id: `e-${taskId}-${tgt.id}`, source: taskId, target: tgt.id, animated: true });
      });

      taskRowIndex++;
    });


    // --- Legacy ETL (Disabled visual) ---
    // (Old ETL visualization code removed)


    // Preserve positions of existing nodes to prevent jitter
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

  }, [dataSource, collection, delivery, etl, topics, mappings, mappingTasks, connections, listFiles, select, activeSteps, getLegacyCount, getCount, setNodes, setEdges]);

  // Auto-align nodes when the flow is initialized
  const [hasAutoAligned, setHasAutoAligned] = useState(false);
  useEffect(() => {
    if (rfInstance && nodes.length > 0 && edges.length > 0 && !hasAutoAligned) {
      setHasAutoAligned(true);
      // Delay to ensure nodes are rendered
      window.requestAnimationFrame(() => {
        const dagreGraph = new dagre.graphlib.Graph();
        dagreGraph.setDefaultEdgeLabel(() => ({}));

        const isMobile = window.innerWidth < 768;
        const rankdir = isMobile ? 'TB' : 'LR';
        dagreGraph.setGraph({ rankdir });

        const getWidth = (node: Node) => {
            const baseWidth = node.type === 'storage' ? 220 : 180;
            return isMobile ? baseWidth * 0.8 : baseWidth;
        };
        const getHeight = (node: Node) => {
            const baseHeight = node.type === 'storage' ? 120 : 80;
            return isMobile ? baseHeight * 0.8 : baseHeight;
        };

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
            targetPosition: isMobile ? Position.Top : Position.Left,
            sourcePosition: isMobile ? Position.Bottom : Position.Right,
            width: getWidth(node),
            height: getHeight(node),
            position: {
              x: nodeWithPosition.x - getWidth(node) / 2,
              y: nodeWithPosition.y - getHeight(node) / 2,
            },
          };
        });

        setNodes(layoutedNodes);
        rfInstance.fitView({ padding: 0.2, duration: 800 });
      });
    }
  }, [rfInstance, nodes, edges, hasAutoAligned, setNodes]);

  const onLayout = useCallback(() => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    const isMobile = window.innerWidth < 768;
    const rankdir = isMobile ? 'TB' : 'LR';

    const getWidth = (node: Node) => {
        const baseWidth = node.type === 'storage' ? 220 : 180;
        return isMobile ? baseWidth * 0.8 : baseWidth;
    };
    const getHeight = (node: Node) => {
        const baseHeight = node.type === 'storage' ? 120 : 80;
        return isMobile ? baseHeight * 0.8 : baseHeight;
    };

    dagreGraph.setGraph({ rankdir });

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
        targetPosition: isMobile ? Position.Top : Position.Left,
        sourcePosition: isMobile ? Position.Bottom : Position.Right,
        width: getWidth(node),
        height: getHeight(node),
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
