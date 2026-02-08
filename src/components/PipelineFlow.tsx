import React, { useEffect, useCallback, useState, useRef } from 'react';
import ReactFlow, { type Node, type Edge, Background, Controls, Panel, Position, useNodesState, useEdgesState, type ReactFlowInstance, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';
import { LayoutGrid, GitBranch, Workflow, BarChart3, Archive } from 'lucide-react';
import { useFileSystem } from '../lib/VirtualFileSystem';
import { useVirtualDB } from '../lib/VirtualDB';
import { useSettings, type ConnectionDefinition } from '../lib/SettingsContext';
import { type SourceConfig, type TargetConfig } from '../lib/MappingTypes';
import { usePipelineLayout } from '../lib/hooks/usePipelineLayout';
import { STEP_KEYS } from '../lib/constants';
import StorageNode, { type StorageNodeData } from './nodes/StorageNode';
import ProcessNode from './nodes/ProcessNode';
import FlowingEdge from './FlowingEdge';
import MetricEdge from './MetricEdge';
import NodeDetailPanel from './NodeDetailPanel';

const nodeTypes = {
  storage: StorageNode,
  process: ProcessNode,
};

const edgeTypes = {
  flowing: FlowingEdge,
  default: MetricEdge,
};

interface PipelineFlowProps {
  activeSteps?: string[];
}

const PipelineFlow: React.FC<PipelineFlowProps> = ({ activeSteps = [] }) => {
  const { listFiles } = useFileSystem();
  const { select } = useVirtualDB();
  const { dataSource, collection, delivery, etl, topics, mappings, mappingTasks, taskFlows, connections, biDashboard, tables } = useSettings();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  
  // Highlight state
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());

  // Trend calculation
  const prevCounts = useRef<Record<string, number>>({});
  
  // Selection state
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // dagreレイアウト計算のカスタムフック（メモ化済み）
  const { calculateLayout } = usePipelineLayout();

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const getCount = useCallback((conn: ConnectionDefinition, path?: string, tableName?: string) => {
    try {
      if (conn.type === 'file' && path) {
        return listFiles(conn.host, path).length;
      } else if (conn.type === 'database' && tableName) {
        return select(tableName).length;
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

  // Highlight logic
  const onNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
    setHoveredNodeId(node.id);
    
    if (!rfInstance) return;
    
    const connected = new Set<string>();
    connected.add(node.id);
    
    const allEdges = rfInstance.getEdges();
    
    // Simple 1-hop connection finding (can be expanded to full path)
    allEdges.forEach(edge => {
      if (edge.source === node.id) {
        connected.add(edge.target);
        connected.add(edge.id);
      } else if (edge.target === node.id) {
        connected.add(edge.source);
        connected.add(edge.id);
      }
    });
    
    setConnectedIds(connected);
  }, [rfInstance]);

  const onNodeMouseLeave = useCallback(() => {
    setHoveredNodeId(null);
    setConnectedIds(new Set());
  }, []);

  useEffect(() => {
    const calculatedNodes: Node[] = [];
    const calculatedEdges: Edge[] = [];
    const keyNodeMap = new Map<string, Node>();

    // Helper to generate keys
    const getLegacyKey = (host: string, path: string) => `legacy:${host}:${path}`;
    const getConnectionKey = (conn: ConnectionDefinition, path?: string, tableName?: string) => {
      if (conn.type === 'file' && path) return `legacy:${conn.host}:${path}`; // Reuse legacy format to merge nodes
      if (conn.type === 'database' && tableName) return `db:${tableName}`;
      return `conn:${conn.id}`; // Fallback to connection ID
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
      const count = getLegacyCount(host, path);
      
      // Calculate Trend
      const prev = prevCounts.current[id] ?? count;
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (count > prev) trend = 'up';
      else if (count < prev) trend = 'down';
      prevCounts.current[id] = count;

      const node: Node<StorageNodeData> = {
        id,
        type: 'storage',
        position: { x: 50 + colIndex * 300, y: 50 + rowIndex * 150 },
        data: { 
            label, 
            type: 'fs', 
            count,
            trend
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
      calculatedNodes.push(node);
      keyNodeMap.set(key, node);
      return node;
    };

    const addConnectionStorageNode = (conn: ConnectionDefinition, colIndex: number = 0, rowIndex: number = 0, path?: string, tableName?: string) => {
      const key = getConnectionKey(conn, path, tableName);
      if (keyNodeMap.has(key)) return keyNodeMap.get(key)!;

      const id = `storage-${key.replace(/[^a-zA-Z0-9-_]/g, '_')}`;
      const count = getCount(conn, path, tableName);
      
      // Calculate Trend
      const prev = prevCounts.current[id] ?? count;
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (count > prev) trend = 'up';
      else if (count < prev) trend = 'down';
      prevCounts.current[id] = count;

      const node: Node<StorageNodeData> = {
        id,
        type: 'storage',
        position: { x: 50 + colIndex * 300, y: 50 + rowIndex * 150 },
        data: {
          label: conn.type === 'database' ? `DB: ${tableName || conn.name}` : `${conn.host}:${path || '?'}`,
          type: conn.type === 'database' ? 'db' : 'fs',
          count,
          trend,
          capacity: conn.type === 'database' ? 10000 : 1000 // Fake capacity for visual demo
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
      calculatedNodes.push(node);
      keyNodeMap.set(key, node);
      return node;
    };


    // --- 0. Pre-register all Storage Nodes ---
    // (Existing logic preserved)

    const allStorageKeys = new Set<string>();
    
    // Data Source paths
    dataSource.jobs.forEach(job => {
        const conn = connections.find(c => c.id === job.connectionId);
        if (conn?.type === 'file' && conn.host && job.path) {
            allStorageKeys.add(getLegacyKey(conn.host, job.path));
        }
    });

    // Collection paths
    collection.jobs.forEach(j => {
      const srcConn = connections.find(c => c.id === j.sourceConnectionId);
      if (srcConn?.type === 'file' && j.sourcePath) {
        allStorageKeys.add(getLegacyKey(srcConn.host, j.sourcePath));
      }
      
      if (j.targetType === 'topic' && j.targetTopicId) {
        allStorageKeys.add(getLegacyKey('localhost', `/topics/${j.targetTopicId}`));
      } else if (j.targetConnectionId && j.targetPath) {
        const conn = connections.find(c => c.id === j.targetConnectionId);
        if (conn?.type === 'file') {
          allStorageKeys.add(getLegacyKey(conn.host, j.targetPath));
        }
      }
    });

    // Archive paths
    (dataSource.archiveJobs || []).forEach(j => {
      const srcConn = connections.find(c => c.id === j.sourceConnectionId);
      if (srcConn?.type === 'file' && j.sourcePath) {
        allStorageKeys.add(getLegacyKey(srcConn.host, j.sourcePath));
      }
      const tgtConn = connections.find(c => c.id === j.targetConnectionId);
      if (tgtConn?.type === 'file' && j.targetPath) {
        allStorageKeys.add(getLegacyKey(tgtConn.host, j.targetPath));
      }
    });

    // Delivery paths
    delivery.jobs.forEach(j => {
      if (j.sourceType === 'topic' && j.sourceTopicId) {
        allStorageKeys.add(getLegacyKey('localhost', `/topics/${j.sourceTopicId}`));
      } else if (j.sourceConnectionId && j.sourcePath) {
        const conn = connections.find(c => c.id === j.sourceConnectionId);
        if (conn?.type === 'file') {
          allStorageKeys.add(getLegacyKey(conn.host, j.sourcePath));
        }
      }

      if (j.targetConnectionId && j.targetPath) {
          const conn = connections.find(c => c.id === j.targetConnectionId);
          if (conn?.type === 'file') {
              allStorageKeys.add(getLegacyKey(conn.host, j.targetPath));
          }
      }
    });

    // Create all collected nodes
    let storageRowIndex = 0;
    allStorageKeys.forEach(key => {
      const parts = key.split(':');
      const host = parts[1];
      const path = parts[2];
      
      let col = 1;
      const isTopic = host === 'localhost' && path.startsWith('/topics/');
      
      const isDataSource = dataSource.jobs.some(job => {
        const conn = connections.find(c => c.id === job.connectionId);
        return conn?.host === host && job.path === path;
      });

      if (isTopic) col = 2;
      else if (!isDataSource) col = 2;

      addLegacyStorageNode(host, path, col, storageRowIndex++);
    });


    // --- 1. Render Legacy Pipeline ---

    // Legacy Process Nodes
    dataSource.jobs.forEach((job) => {
      if (!job.enabled) return;
      const conn = connections.find(c => c.id === job.connectionId);
      if (!conn || conn.type !== 'file' || !conn.host || !job.path) return;

      const targetNode = keyNodeMap.get(getLegacyKey(conn.host, job.path));
      if (!targetNode) return;

      const id = `process-gen-${job.id}`;
      
      calculatedNodes.push({
        id, type: 'process',
        position: { x: targetNode.position.x - 250, y: targetNode.position.y },
        data: { 
            label: job.name, 
            status: 'idle',
            progress: 0
        },
      });
      calculatedEdges.push({ 
          id: `e-${id}-${targetNode.id}`, 
          source: id, 
          target: targetNode.id, 
          type: 'flowing', 
          animated: true,
          data: { isAnimating: true, count: targetNode.data.count } // Show count on edge
      });
    });

    collection.jobs.forEach((job) => {
      if (!job.enabled) return;
      let targetHost = '', targetPath = '';
      if (job.targetType === 'topic' && job.targetTopicId) {
          targetHost = 'localhost'; targetPath = `/topics/${job.targetTopicId}`;
      } else if (job.targetPath) {
          const conn = connections.find(c => c.id === job.targetConnectionId);
          if (conn && conn.type === 'file') { targetHost = conn.host; targetPath = job.targetPath; }
      }

      let sourceHost = '', sourcePath = '';
      const srcConn = connections.find(c => c.id === job.sourceConnectionId);
      if (srcConn && srcConn.type === 'file' && job.sourcePath) { sourceHost = srcConn.host; sourcePath = job.sourcePath; }

      const srcNode = keyNodeMap.get(getLegacyKey(sourceHost, sourcePath)) || (sourceHost && sourcePath ? addLegacyStorageNode(sourceHost, sourcePath, 1, 0) : null);
      const tgtNode = keyNodeMap.get(getLegacyKey(targetHost, targetPath)) || (targetHost && targetPath ? addLegacyStorageNode(targetHost, targetPath, 2, 0) : null);
      
      if (srcNode && tgtNode) {
        const id = `process-col-${job.id}`;
        const isProcessing = activeSteps.includes(`${STEP_KEYS.COLLECTION_TRANSFER}_${job.id}`);
        
        calculatedNodes.push({
          id, type: 'process',
          position: { x: (srcNode.position.x + tgtNode.position.x) / 2, y: (srcNode.position.y + tgtNode.position.y) / 2 },
          data: { 
              label: job.name, 
              status: isProcessing ? 'running' : 'idle',
              progress: isProcessing ? 65 : undefined 
            }
        });
        calculatedEdges.push({ id: `e-${srcNode.id}-${id}`, source: srcNode.id, target: id, type: 'flowing', animated: true, data: { isAnimating: isProcessing } });
        calculatedEdges.push({ id: `e-${id}-${tgtNode.id}`, source: id, target: tgtNode.id, type: 'flowing', animated: true, data: { isAnimating: isProcessing, count: tgtNode.data.count } });
      }
    });

    delivery.jobs.forEach((job) => {
      if (!job.enabled) return;
      let sourceHost = '', sourcePath = '';
      if (job.sourceType === 'topic' && job.sourceTopicId) {
          sourceHost = 'localhost'; sourcePath = `/topics/${job.sourceTopicId}`;
      } else if (job.sourcePath) {
          const conn = connections.find(c => c.id === job.sourceConnectionId);
          if (conn && conn.type === 'file') { sourceHost = conn.host; sourcePath = job.sourcePath; }
      }

      let targetHost = '', targetPath = '';
      const tgtConn = connections.find(c => c.id === job.targetConnectionId);
      if (tgtConn && tgtConn.type === 'file' && job.targetPath) { targetHost = tgtConn.host; targetPath = job.targetPath; }

      const srcNode = keyNodeMap.get(getLegacyKey(sourceHost, sourcePath)) || (sourceHost && sourcePath ? addLegacyStorageNode(sourceHost, sourcePath, 1, 0) : null);
      const tgtNode = keyNodeMap.get(getLegacyKey(targetHost, targetPath)) || (targetHost && targetPath ? addLegacyStorageNode(targetHost, targetPath, 2, 0) : null);
      
      if (srcNode && tgtNode) {
        const id = `process-del-${job.id}`;
        const isProcessing = activeSteps.includes(`${STEP_KEYS.DELIVERY_TRANSFER}_${job.id}`);

        calculatedNodes.push({
          id, type: 'process',
          position: { x: (srcNode.position.x + tgtNode.position.x) / 2, y: (srcNode.position.y + tgtNode.position.y) / 2 },
          data: { 
              label: job.name, 
              status: isProcessing ? 'running' : 'idle',
              progress: isProcessing ? 45 : undefined
            }
        });
        calculatedEdges.push({ id: `e-${srcNode.id}-${id}`, source: srcNode.id, target: id, type: 'flowing', animated: true, data: { isAnimating: isProcessing } });
        calculatedEdges.push({ id: `e-${id}-${tgtNode.id}`, source: id, target: tgtNode.id, type: 'flowing', animated: true, data: { isAnimating: isProcessing, count: tgtNode.data.count } });
      }
    });

    // --- 2. Render Archive Jobs ---

    (dataSource.archiveJobs || []).forEach((job) => {
        if (!job.enabled) return;

        const srcConn = connections.find(c => c.id === job.sourceConnectionId);
        const tgtConn = connections.find(c => c.id === job.targetConnectionId);
        if (!srcConn || !tgtConn || !job.sourcePath || !job.targetPath) return;

        const srcNode = keyNodeMap.get(getLegacyKey(srcConn.host, job.sourcePath)) || 
                        addLegacyStorageNode(srcConn.host, job.sourcePath, 1, 0);
        const tgtNode = keyNodeMap.get(getLegacyKey(tgtConn.host, job.targetPath)) || 
                        addLegacyStorageNode(tgtConn.host, job.targetPath, 2, 0);

        const id = `process-arc-${job.id}`;
        const isProcessing = activeSteps.includes(`${STEP_KEYS.ARCHIVE_JOB}_${job.id}`);

        calculatedNodes.push({
            id, type: 'process',
            position: { x: (srcNode.position.x + tgtNode.position.x) / 2, y: (srcNode.position.y + tgtNode.position.y) / 2 },
            data: { 
                label: job.name, 
                status: isProcessing ? 'running' : 'idle',
                progress: isProcessing ? 80 : undefined,
                icon: <Archive size={16} className="text-amber-600" />
            }
        });
        calculatedEdges.push({ id: `e-${srcNode.id}-${id}`, source: srcNode.id, target: id, type: 'flowing', animated: true, data: { isAnimating: isProcessing } });
        calculatedEdges.push({ id: `e-${id}-${tgtNode.id}`, source: id, target: tgtNode.id, type: 'flowing', animated: true, data: { isAnimating: isProcessing } });
    });


    // --- 3. Render Mapping Tasks ---

    let taskRowIndex = 0;
    const TASK_START_X = 600;

    mappingTasks.forEach(task => {
      if (!task.enabled) return;
      const mapping = mappings.find(m => m.id === task.mappingId);
      if (!mapping) return;

      const taskId = `process-task-${task.id}`;
      const isProcessing = activeSteps.includes(`${STEP_KEYS.MAPPING_TASK}_${task.id}`);

      // Find Connections
      const sources = mapping.transformations.filter(t => t.type === 'source');
      const targets = mapping.transformations.filter(t => t.type === 'target');

      const sourceNodes: Node[] = [];
      const targetNodes: Node[] = [];

      sources.forEach(src => {
        const conf = src.config as SourceConfig;
        const conn = connections.find(c => c.id === conf.connectionId);
        if (conn) {
          const node = addConnectionStorageNode(conn, 3, taskRowIndex, conf.path, conf.tableName);
          sourceNodes.push(node);
        }
      });

      targets.forEach(tgt => {
        const conf = tgt.config as TargetConfig;
        const conn = connections.find(c => c.id === conf.connectionId);
        if (conn) {
          const node = addConnectionStorageNode(conn, 5, taskRowIndex, conf.path, conf.tableName);
          targetNodes.push(node);
        }
      });

      // Place Task Node
      const allConnectedNodes = [...sourceNodes, ...targetNodes];
      let avgY = 0;
      if (allConnectedNodes.length > 0) {
        avgY = allConnectedNodes.reduce((sum, n) => sum + n.position.y, 0) / allConnectedNodes.length;
      } else {
        avgY = 50 + taskRowIndex * 150;
      }

      calculatedNodes.push({
        id: taskId,
        type: 'process',
        position: { x: TASK_START_X + 200, y: avgY },
        data: { 
            label: task.name, 
            status: isProcessing ? 'running' : 'idle',
            progress: isProcessing ? 50 : undefined
        }
      });

      // Edges
      sourceNodes.forEach(src => {
        calculatedEdges.push({ id: `e-${src.id}-${taskId}`, source: src.id, target: taskId, type: 'flowing', animated: true, data: { isAnimating: isProcessing } });
      });
      targetNodes.forEach(tgt => {
        calculatedEdges.push({ id: `e-${taskId}-${tgt.id}`, source: taskId, target: tgt.id, type: 'flowing', animated: true, data: { isAnimating: isProcessing, count: tgt.data.count } });
      });

      taskRowIndex++;
    });


    // --- 3. Render Task Dependencies ---
    mappingTasks.forEach(task => {
        if (!task.enabled || !task.dependencies) return;
        
        const targetTaskId = `process-task-${task.id}`;
        task.dependencies.forEach(depId => {
            const sourceTaskId = `process-task-${depId}`;
            if (calculatedNodes.some(n => n.id === sourceTaskId) && calculatedNodes.some(n => n.id === targetTaskId)) {
                calculatedEdges.push({
                    id: `e-dep-${depId}-${task.id}`,
                    source: sourceTaskId,
                    target: targetTaskId,
                    animated: true,
                    label: 'depends on',
                    style: { stroke: '#ef4444', strokeWidth: 1, strokeDasharray: '2,2' }
                });
            }
        });
    });


    // --- 4. Render Task Flows ---

    const collectTaskFlowDataSources = (flow: typeof taskFlows[0]) => {
      const sources = new Set<string>();
      const targets = new Set<string>();

      flow.taskIds.forEach(taskId => {
        const task = mappingTasks.find(t => t.id === taskId);
        if (!task) return;

        const mapping = mappings.find(m => m.id === task.mappingId);
        if (!mapping) return;

        mapping.transformations.filter(t => t.type === 'source').forEach(src => {
          const conf = src.config as SourceConfig;
          const conn = connections.find(c => c.id === conf.connectionId);
          if (conn) {
            if (!keyNodeMap.has(getConnectionKey(conn, conf.path, conf.tableName))) {
              addConnectionStorageNode(conn, 3, taskRowIndex++, conf.path, conf.tableName);
            }
            sources.add(getConnectionKey(conn, conf.path, conf.tableName));
          }
        });

        mapping.transformations.filter(t => t.type === 'target').forEach(tgt => {
          const conf = tgt.config as TargetConfig;
          const conn = connections.find(c => c.id === conf.connectionId);
          if (conn) {
            if (!keyNodeMap.has(getConnectionKey(conn, conf.path, conf.tableName))) {
              addConnectionStorageNode(conn, 5, taskRowIndex++, conf.path, conf.tableName);
            }
            targets.add(getConnectionKey(conn, conf.path, conf.tableName));
          }
        });
      });

      return { sources, targets };
    };

    taskFlows.forEach(flow => {
      if (!flow.enabled) return;

      const flowId = `process-flow-${flow.id}`;
      const isProcessing = activeSteps.includes(`${STEP_KEYS.TASK_FLOW}_${flow.id}`);

      calculatedNodes.push({
        id: flowId,
        type: 'process',
        position: { x: TASK_START_X + 500, y: 50 },
        data: {
            label: `Flow: ${flow.name}`,
            status: isProcessing ? 'running' : 'idle',
            progress: isProcessing ? 30 : undefined,
            icon: <GitBranch size={16} className="text-indigo-600" />
        }
      });

      flow.taskIds.forEach(taskId => {
        const targetTaskId = `process-task-${taskId}`;
        if (calculatedNodes.some(n => n.id === targetTaskId)) {
          calculatedEdges.push({
            id: `e-${flowId}-${targetTaskId}`,
            source: flowId,
            target: targetTaskId,
            animated: true,
            label: 'contains',
            style: { stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '5,5' }
          });
        }
      });

      flow.taskIds.forEach(taskId => {
        const task = mappingTasks.find(t => t.id === taskId);
        if (!task?.dependencies) return;

        const targetTaskId = `process-task-${taskId}`;
        task.dependencies.forEach(depId => {
          if (flow.taskIds.includes(depId)) {
            const sourceTaskId = `process-task-${depId}`;
            if (calculatedNodes.some(n => n.id === sourceTaskId) && calculatedNodes.some(n => n.id === targetTaskId)) {
              const edgeId = `e-flow-dep-${flow.id}-${depId}-${taskId}`;
              if (!calculatedEdges.some(e => e.id === edgeId || e.id === `e-dep-${depId}-${taskId}`)) {
                calculatedEdges.push({
                  id: edgeId,
                  source: sourceTaskId,
                  target: targetTaskId,
                  animated: true,
                  label: 'depends on',
                  style: { stroke: '#ef4444', strokeWidth: 1.5, strokeDasharray: '3,3' }
                });
              }
            }
          }
        });
      });

      const { sources, targets } = collectTaskFlowDataSources(flow);

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
    });


    // --- 5. Render BI Dashboard ---

    biDashboard.items.forEach((item, index) => {
      const dashboardId = `process-bi-${item.id}`;

      calculatedNodes.push({
        id: dashboardId,
        type: 'process',
        position: { x: TASK_START_X + 700, y: 50 + index * 150 },
        data: {
          label: `BI: ${item.title || 'Dashboard'}`,
          status: 'idle',
          icon: <BarChart3 size={16} className="text-emerald-600" />
        }
      });

      const tableDef = tables.find(t => t.id === item.tableId);
      if (tableDef) {
        const tableKey = `db:${tableDef.name}`;
        if (!keyNodeMap.has(tableKey)) {
          const tableNodeId = `storage-${tableKey.replace(/[^a-zA-Z0-9-_]/g, '_')}`;
          const count = select(tableDef.name).length;
          
           // Trend for BI tables
          const prev = prevCounts.current[tableNodeId] ?? count;
          let trend: 'up' | 'down' | 'stable' = 'stable';
          if (count > prev) trend = 'up';
          else if (count < prev) trend = 'down';
          prevCounts.current[tableNodeId] = count;

          const tableNode: Node = {
            id: tableNodeId,
            type: 'storage',
            position: { x: TASK_START_X + 500, y: 50 + index * 150 },
            data: {
              label: `DB: ${tableDef.name}`,
              type: 'db',
              count,
              trend,
              capacity: 10000
            },
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
          };
          calculatedNodes.push(tableNode);
          keyNodeMap.set(tableKey, tableNode);
        }

        const tableNode = keyNodeMap.get(tableKey);
        if (tableNode) {
          calculatedEdges.push({
            id: `e-bi-${item.id}-${tableNode.id}`,
            source: tableNode.id,
            target: dashboardId,
            animated: false,
            style: { stroke: '#10b981', strokeWidth: 1.5 },
            label: 'visualizes'
          });
        }
      }
    });

    // Apply highlighting
    const finalNodes = calculatedNodes.map(node => ({
      ...node,
      style: {
        ...node.style,
        opacity: hoveredNodeId && !connectedIds.has(node.id) ? 0.2 : 1,
        transition: 'opacity 0.2s ease-in-out'
      }
    }));

    const finalEdges = calculatedEdges.map(edge => ({
      ...edge,
      style: {
        ...edge.style,
        opacity: hoveredNodeId && !connectedIds.has(edge.id) ? 0.1 : 1,
        stroke: hoveredNodeId && connectedIds.has(edge.id) ? '#3b82f6' : (edge.style?.stroke || '#b1b1b7'),
        strokeWidth: hoveredNodeId && connectedIds.has(edge.id) ? 3 : (edge.style?.strokeWidth || 1.5),
        transition: 'all 0.2s ease-in-out'
      },
      // Ensure flowing edges get the data prop for animation
      data: {
          ...edge.data,
          // If we are hovering, maybe stop animation or highlight? 
          // For now, keep as is.
      }
    }));


    // Preserve positions of existing nodes to prevent jitter
    setNodes((prevNodes) => {
      const prevNodeMap = new Map(prevNodes.map(n => [n.id, n]));
      return finalNodes.map(n => {
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

    setEdges(finalEdges);

  }, [dataSource, collection, delivery, etl, topics, mappings, mappingTasks, taskFlows, connections, biDashboard, tables, listFiles, select, activeSteps, getLegacyCount, getCount, setNodes, setEdges, hoveredNodeId, connectedIds]);

  // Auto-align logic ... (Same as before)
  const [hasAutoAligned, setHasAutoAligned] = useState(false);
  useEffect(() => {
    if (rfInstance && nodes.length > 0 && edges.length > 0 && !hasAutoAligned) {
      setHasAutoAligned(true);
      window.requestAnimationFrame(() => {
        const layoutedNodes = calculateLayout(nodes, edges);
        setNodes(layoutedNodes);
        rfInstance.fitView({ padding: 0.2, duration: 800 });
      });
    }
  }, [rfInstance, nodes, edges, hasAutoAligned, setNodes, calculateLayout]);

  const onLayout = useCallback(() => {
    const layoutedNodes = calculateLayout(nodes, edges);
    setNodes(layoutedNodes);

    if (rfInstance) {
      window.requestAnimationFrame(() => {
        rfInstance.fitView({ padding: 0.2, duration: 800 });
      });
    }
  }, [nodes, edges, setNodes, rfInstance, calculateLayout]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onInit={setRfInstance}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        attributionPosition="bottom-right"
        minZoom={0.2}
      >
        <Background />
        <Controls />
        <MiniMap 
            nodeStrokeColor={(n) => {
                if (n.type === 'storage') return '#2563eb';
                if (n.type === 'process') return '#ea580c';
                return '#eee';
            }}
            nodeColor={(n) => {
                if (n.type === 'storage') return '#eff6ff';
                if (n.type === 'process') return '#fff7ed';
                return '#fff';
            }}
        />
        <Panel position="top-left">
          <div className="bg-white/80 backdrop-blur-sm px-3 py-2 rounded shadow border border-gray-200">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <Workflow size={16} className="text-blue-600" />
              Pipeline Architecture Visualizer
            </h3>
          </div>
        </Panel>
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
      
      {/* Detail Panel Overlay */}
      <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
    </div>
  );
};

export default PipelineFlow;