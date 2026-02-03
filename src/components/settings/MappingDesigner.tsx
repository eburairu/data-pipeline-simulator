import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
    Background,
    Controls,
    Panel,
    type Node,
    type Edge,
    type Connection,
    Handle,
    Position,
    MarkerType,
    type ReactFlowInstance,
    useNodesState,
    useEdgesState,
    type NodeChange,
    type EdgeChange
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { useSettings } from '../../lib/SettingsContext';
import {
    type Mapping,
    type Transformation,
    type TransformationType,
    type SourceConfig,
    type FilterConfig,
    type TargetConfig,
    type ExpressionConfig,
    type AggregatorConfig,
    type ValidatorConfig,
    type JoinerConfig,
    type LookupConfig,
    type RouterConfig,
    type SorterConfig,
    type NormalizerConfig,
    type RankConfig,
    type SequenceConfig,
    type UpdateStrategyConfig,
    type CleansingConfig,
    type DeduplicatorConfig,
    type PivotConfig,
    type UnpivotConfig,
    type SqlConfig,
    type WebServiceConfig,
    type HierarchyParserConfig,
    type FieldExpression,
    type AggregateField,
    type SortField,
    type RouterRoute,
    type CleansingRule,
    type ValidatorRule,
} from '../../lib/MappingTypes';
import { type ExecutionStats } from '../../lib/MappingEngine';
import MetricEdge from '../MetricEdge';
import { Trash2, Plus, Save, X, Edit3, LayoutGrid, CheckSquare, Search, GitFork, ArrowUpDown, Merge, Repeat, Award, Hash, Flag, Sparkles, Copy, Table, Columns, Database, Globe, FileJson } from 'lucide-react';

// --- Constants ---
const TRANSFORMATION_TYPES = [
    { type: 'source', label: 'Source', short: 'SRC', bg: 'bg-green-100', border: 'border-green-500', icon: null },
    { type: 'target', label: 'Target', short: 'TGT', bg: 'bg-red-100', border: 'border-red-500', icon: null },
    { type: 'filter', label: 'Filter', short: 'FLT', bg: 'bg-yellow-100', border: 'border-yellow-500', icon: null },
    { type: 'expression', label: 'Expression', short: 'EXP', bg: 'bg-purple-100', border: 'border-purple-500', icon: null },
    { type: 'aggregator', label: 'Aggregator', short: 'AGG', bg: 'bg-orange-100', border: 'border-orange-500', icon: null },
    { type: 'lookup', label: 'Lookup', short: null, bg: 'bg-cyan-100', border: 'border-cyan-500', icon: Search },
    { type: 'joiner', label: 'Joiner', short: 'JOIN', bg: 'bg-blue-100', border: 'border-blue-500', icon: null },
    { type: 'union', label: 'Union', short: null, bg: 'bg-indigo-100', border: 'border-indigo-500', icon: Merge },
    { type: 'router', label: 'Router', short: null, bg: 'bg-lime-100', border: 'border-lime-500', icon: GitFork },
    { type: 'sorter', label: 'Sorter', short: null, bg: 'bg-amber-100', border: 'border-amber-500', icon: ArrowUpDown },
    { type: 'normalizer', label: 'Normalizer', short: null, bg: 'bg-violet-100', border: 'border-violet-500', icon: Repeat },
    { type: 'rank', label: 'Rank', short: null, bg: 'bg-rose-100', border: 'border-rose-500', icon: Award },
    { type: 'sequence', label: 'Sequence', short: null, bg: 'bg-sky-100', border: 'border-sky-500', icon: Hash },
    { type: 'updateStrategy', label: 'Update Strategy', short: null, bg: 'bg-slate-100', border: 'border-slate-500', icon: Flag },
    { type: 'validator', label: 'Validator', short: null, bg: 'bg-pink-100', border: 'border-pink-500', icon: CheckSquare },
    { type: 'cleansing', label: 'Cleansing', short: null, bg: 'bg-teal-100', border: 'border-teal-500', icon: Sparkles },
    { type: 'deduplicator', label: 'Deduplicator', short: null, bg: 'bg-orange-100', border: 'border-orange-500', icon: Copy },
    { type: 'pivot', label: 'Pivot', short: null, bg: 'bg-purple-100', border: 'border-purple-500', icon: Table },
    { type: 'unpivot', label: 'Unpivot', short: null, bg: 'bg-fuchsia-100', border: 'border-fuchsia-500', icon: Columns },
    { type: 'webService', label: 'Web Service', short: 'WS', bg: 'bg-indigo-100', border: 'border-indigo-500', icon: Globe },
    { type: 'hierarchyParser', label: 'Hierarchy Parser', short: 'HP', bg: 'bg-green-100', border: 'border-green-500', icon: FileJson },
    { type: 'sql', label: 'SQL', short: null, bg: 'bg-slate-100', border: 'border-slate-500', icon: Database },
];

// --- Custom Nodes for Designer ---
const DesignerNode = ({ data }: { data: { label: string, type: string, isSelected: boolean, stats?: { input: number, output: number, errors: number, rejects: number } } }) => {
    const style = data.isSelected ? { border: '2px solid #2563eb' } : {};
    return (
        <div className={`px-4 py-2 shadow-md rounded-md bg-white border border-gray-200 text-xs w-32 flex flex-col items-center justify-center relative`} style={style}>
            <Handle type="target" position={Position.Left} className="w-2 h-2" />
            <div className="font-bold text-center truncate w-full">{data.label}</div>
            <div className="text-[10px] text-gray-500 uppercase">{data.type}</div>

            {/* Stats Overlay */}
            {data.stats && (data.stats.input > 0 || data.stats.output > 0 || data.stats.errors > 0) && (
                <div className="absolute -top-3 -right-3 bg-white border border-gray-200 shadow-sm rounded-lg p-1 flex flex-col items-center text-[8px] z-10 min-w-[40px]">
                    {data.stats.errors > 0 && <span className="text-red-600 font-bold">Err: {data.stats.errors}</span>}
                    <span className="text-green-600">In: {data.stats.input}</span>
                    <span className="text-blue-600">Out: {data.stats.output}</span>
                </div>
            )}

            <Handle type="source" position={Position.Right} className="w-2 h-2" />
        </div>
    );
};

const nodeTypes = {
    designer: DesignerNode
};

const edgeTypes = {
    metric: MetricEdge
};

// --- Layout Helper ---
const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    const nodeWidth = 150;
    const nodeHeight = 50;

    dagreGraph.setGraph({ rankdir: 'LR' });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        node.targetPosition = Position.Left;
        node.sourcePosition = Position.Right;
        node.position = {
            x: nodeWithPosition.x - nodeWidth / 2,
            y: nodeWithPosition.y - nodeHeight / 2,
        };
    });

    return { nodes, edges };
};

interface MappingDesignerProps {
    executionStats?: ExecutionStats;
    readOnly?: boolean;
    initialMappingId?: string;
}

const MappingDesigner: React.FC<MappingDesignerProps> = ({ executionStats, readOnly = false, initialMappingId }) => {
    const { mappings, addMapping, updateMapping, removeMapping, connections } = useSettings();
    const [editingMapping, setEditingMapping] = useState<Mapping | null>(null);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
    const [hasAutoAligned, setHasAutoAligned] = useState(false);

    useEffect(() => {
        if (initialMappingId) {
            const m = mappings.find(m => m.id === initialMappingId);
            if (m && (!editingMapping || editingMapping.id !== initialMappingId)) {
                setEditingMapping(JSON.parse(JSON.stringify(m)));
            }
        }
    }, [initialMappingId, mappings, editingMapping]);

    const handleCreate = () => {
        if (readOnly) return;
        const newMapping: Mapping = {
            id: `map_${crypto.randomUUID().substring(0, 8)}`,
            name: 'New Mapping',
            transformations: [],
            links: []
        };
        addMapping(newMapping);
        setEditingMapping(newMapping);
        setSelectedNodeId(null);
    };

    const handleEdit = (m: Mapping) => {
        setEditingMapping(JSON.parse(JSON.stringify(m)));
        setSelectedNodeId(null);
    };

    const handleSave = () => {
        if (editingMapping && !readOnly) {
            updateMapping(editingMapping.id, editingMapping);
            setEditingMapping(null);
        }
    };

    const handleDelete = (id: string) => {
        if (readOnly) return;
        removeMapping(id);
        if (editingMapping?.id === id) setEditingMapping(null);
    };

    const addTransformation = (type: TransformationType) => {
        if (readOnly || !editingMapping) return;

        const id = `t_${crypto.randomUUID().substring(0, 8)}`;
        let newTrans: Transformation;

        const base = {
            id,
            type,
            name: `${type}_${editingMapping.transformations.length + 1}`,
            position: { x: 0, y: 0 }
        };

        switch (type) {
            case 'source': newTrans = { ...base, type: 'source', config: { connectionId: '' } }; break;
            case 'target': newTrans = { ...base, type: 'target', config: { connectionId: '' } }; break;
            case 'filter': newTrans = { ...base, type: 'filter', config: { condition: 'true' } }; break;
            case 'expression': newTrans = { ...base, type: 'expression', config: { fields: [] } }; break;
            case 'aggregator': newTrans = { ...base, type: 'aggregator', config: { groupBy: [], aggregates: [] } }; break;
            case 'validator': newTrans = { ...base, type: 'validator', config: { rules: [], errorBehavior: 'skip' } }; break;
            case 'joiner': newTrans = { ...base, type: 'joiner', config: { joinType: 'inner', masterKeys: [], detailKeys: [] } }; break;
            case 'lookup': newTrans = { ...base, type: 'lookup', config: { connectionId: '', lookupKeys: [], referenceKeys: [], returnFields: [], defaultValue: '' } }; break;
            case 'router': newTrans = { ...base, type: 'router', config: { routes: [], defaultGroup: 'default' } }; break;
            case 'sorter': newTrans = { ...base, type: 'sorter', config: { sortFields: [] } }; break;
            case 'union': newTrans = { ...base, type: 'union', config: {} }; break;
            case 'normalizer': newTrans = { ...base, type: 'normalizer', config: { arrayField: '', outputFields: [], keepOriginalFields: true } }; break;
            case 'rank': newTrans = { ...base, type: 'rank', config: { partitionBy: [], orderBy: [], rankField: 'rank', rankType: 'rowNumber' } }; break;
            case 'sequence': newTrans = { ...base, type: 'sequence', config: { sequenceField: 'seq', startValue: 1, incrementBy: 1 } }; break;
            case 'updateStrategy': newTrans = { ...base, type: 'updateStrategy', config: { strategyField: '_strategy', defaultStrategy: 'insert', conditions: [] } }; break;
            case 'cleansing': newTrans = { ...base, type: 'cleansing', config: { rules: [] } }; break;
            case 'deduplicator': newTrans = { ...base, type: 'deduplicator', config: { keys: [], caseInsensitive: false } }; break;
            case 'pivot': newTrans = { ...base, type: 'pivot', config: { groupByFields: [], pivotField: '', valueField: '' } }; break;
            case 'unpivot': newTrans = { ...base, type: 'unpivot', config: { fieldsToUnpivot: [], newHeaderFieldName: 'Metric', newValueFieldName: 'Value' } }; break;
            case 'sql': newTrans = { ...base, type: 'sql', config: { sqlQuery: '', mode: 'query' } }; break;
            case 'webService': newTrans = { ...base, type: 'webService', config: { url: 'http://api.example.com/data', method: 'GET', headers: [], responseMap: [] } }; break;
            case 'hierarchyParser': newTrans = { ...base, type: 'hierarchyParser', config: { inputField: '', outputFields: [] } }; break;
            default: return;
        }

        const newLinks = [...editingMapping.links];
        if (selectedNodeId) {
            newLinks.push({
                id: `l_${crypto.randomUUID().substring(0, 8)}`,
                sourceId: selectedNodeId,
                targetId: id
            });
        }

        setEditingMapping({
            ...editingMapping,
            transformations: [...editingMapping.transformations, newTrans],
            links: newLinks
        });
        setSelectedNodeId(id);
    };

    const removeTransformation = (id: string) => {
        if (readOnly || !editingMapping) return;
        setEditingMapping({
            ...editingMapping,
            transformations: editingMapping.transformations.filter(t => t.id !== id),
            links: editingMapping.links.filter(l => l.sourceId !== id && l.targetId !== id)
        });
        if (selectedNodeId === id) setSelectedNodeId(null);
    };

    const updateTransformationConfig = (id: string, config: any) => {
        if (readOnly || !editingMapping) return;
        setEditingMapping({
            ...editingMapping,
            transformations: editingMapping.transformations.map(t =>
                t.id === id ? { ...t, config: { ...t.config, ...config } } : t
            )
        });
    };

    const handleNodeClick = (_: any, node: Node) => {
        setSelectedNodeId(node.id);
    };

    const onConnect = useCallback(
        (params: Connection) => {
            if (readOnly || !editingMapping || !params.source || !params.target) return;

            const linkExists = editingMapping.links.some(
                (l) => l.sourceId === params.source && l.targetId === params.target
            );
            if (linkExists) return;
            if (params.source === params.target) return;

            const newLink = {
                id: `l_${crypto.randomUUID().substring(0, 8)}`,
                sourceId: params.source,
                targetId: params.target,
            };

            setEditingMapping((prev) =>
                prev
                    ? {
                        ...prev,
                        links: [...prev.links, newLink],
                    }
                    : null
            );
        },
        [editingMapping, readOnly]
    );

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

    const transformationIds = editingMapping?.transformations.map(t => t.id).join(',') || '';
    const transformationNames = editingMapping?.transformations.map(t => t.name).join(',') || '';
    const linkIds = editingMapping?.links.map(l => l.id).join(',') || '';
    const statsTimestamp = executionStats ? JSON.stringify(executionStats) : '';

    useEffect(() => {
        if (!editingMapping) {
            setNodes([]);
            setEdges([]);
            return;
        }

        const newNodes: Node[] = editingMapping.transformations.map(t => ({
            id: t.id,
            type: 'designer',
            position: t.position || { x: 0, y: 0 },
            data: {
                label: t.name,
                type: t.type,
                isSelected: selectedNodeId === t.id,
                stats: executionStats?.transformations[t.id]
            },
            draggable: !readOnly
        }));

        const newEdges: Edge[] = editingMapping.links.map(l => ({
            id: l.id,
            source: l.sourceId,
            target: l.targetId,
            type: 'metric',
            markerEnd: { type: MarkerType.ArrowClosed },
            data: { count: executionStats?.links?.[l.id] || 0 },
            style: selectedEdgeId === l.id ? { stroke: '#ef4444', strokeWidth: 3 } : { strokeWidth: 2 }
        }));

        const { nodes: layouted } = getLayoutedElements([...newNodes], [...newEdges]);

        setNodes(prevNodes => {
            const prevMap = new Map(prevNodes.map(n => [n.id, n]));
            return layouted.map(n => {
                const prev = prevMap.get(n.id);
                if (prev) {
                    return { ...n, position: prev.position, data: { ...n.data, isSelected: selectedNodeId === n.id, stats: executionStats?.transformations[n.id] } };
                }
                return n;
            });
        });
        setEdges(newEdges);
    }, [transformationIds, transformationNames, linkIds, selectedNodeId, selectedEdgeId, setNodes, setEdges, statsTimestamp, readOnly, executionStats]);

    const handleNodesChange = useCallback((changes: NodeChange[]) => {
        onNodesChange(changes);
        changes.forEach(change => {
            if (change.type === 'position' && change.dragging === false && change.position && !readOnly) {
                setEditingMapping(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        transformations: prev.transformations.map(t =>
                            t.id === change.id ? { ...t, position: change.position! } : t
                        )
                    };
                });
            }
        });
    }, [onNodesChange, readOnly]);

    const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
        if (readOnly) return;
        changes.forEach(change => {
            if (change.type === 'remove') {
                setEditingMapping(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        links: prev.links.filter(l => l.id !== change.id)
                    };
                });
            }
        });
        onEdgesChange(changes);
    }, [onEdgesChange, readOnly]);

    const handleEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
        if (!readOnly) setSelectedEdgeId(prev => prev === edge.id ? null : edge.id);
    }, [readOnly]);

    const deleteSelectedEdge = useCallback(() => {
        if (!selectedEdgeId || !editingMapping || readOnly) return;
        setEditingMapping(prev => {
            if (!prev) return null;
            return {
                ...prev,
                links: prev.links.filter(l => l.id !== selectedEdgeId)
            };
        });
        setSelectedEdgeId(null);
    }, [selectedEdgeId, editingMapping, readOnly]);

    useEffect(() => {
        if (rfInstance && nodes.length > 0 && !hasAutoAligned) {
            setHasAutoAligned(true);
            window.requestAnimationFrame(() => {
                rfInstance.fitView({ padding: 0.2, duration: 500 });
            });
        }
    }, [rfInstance, nodes, hasAutoAligned]);

    useEffect(() => {
        setHasAutoAligned(false);
    }, [editingMapping?.id]);

    const onLayout = useCallback(() => {
        if (!editingMapping || nodes.length === 0) return;

        const dagreGraph = new dagre.graphlib.Graph();
        dagreGraph.setDefaultEdgeLabel(() => ({}));
        dagreGraph.setGraph({ rankdir: 'LR' });

        const nodeWidth = 150;
        const nodeHeight = 50;

        nodes.forEach((node) => {
            dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
        });

        edges.forEach((edge) => {
            dagreGraph.setEdge(edge.source, edge.target);
        });

        dagre.layout(dagreGraph);

        const layoutedNodes = nodes.map((node) => {
            const nodeWithPosition = dagreGraph.node(node.id);
            return {
                ...node,
                position: {
                    x: nodeWithPosition.x - nodeWidth / 2,
                    y: nodeWithPosition.y - nodeHeight / 2,
                },
            };
        });

        setNodes(layoutedNodes);

        if (rfInstance) {
            window.requestAnimationFrame(() => {
                rfInstance.fitView({ padding: 0.2, duration: 500 });
            });
        }
    }, [editingMapping, nodes, edges, setNodes, rfInstance]);

    const renderConfigPanel = () => {
        if (!selectedNodeId || !editingMapping) return <div className="p-4 text-gray-400 text-sm">Select a transformation to edit properties.</div>;

        const node = editingMapping.transformations.find(t => t.id === selectedNodeId);
        if (!node) return null;

        return (
            <div className="p-4 space-y-4">
                <div className="font-bold text-sm border-b pb-2 mb-2 flex justify-between items-center">
                    {node.type.toUpperCase()} Properties
                    <div className="flex items-center gap-2">
                        {!readOnly && (
                            <button onClick={() => removeTransformation(node.id)} className="text-red-500 hover:text-red-700">
                                <Trash2 size={16} />
                            </button>
                        )}
                        <button onClick={() => setSelectedNodeId(null)} className="md:hidden text-gray-500 hover:text-gray-700">
                            <X size={16} />
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-xs text-gray-500">Name</label>
                    <input
                        disabled={readOnly}
                        className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                        value={node.name}
                        onChange={e => {
                            const newName = e.target.value;
                            setEditingMapping(prev => prev ? ({
                                ...prev,
                                transformations: prev.transformations.map(t => t.id === node.id ? { ...t, name: newName } : t)
                            }) : null)
                        }}
                    />
                </div>

                {/* Simplified rendering of config fields to save tokens, but assumes functionality is preserved */}
                {/* In a real scenario, all config forms would be here with readOnly checks */}
                {node.type === 'source' && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-gray-500">Connection</label>
                            <select
                                disabled={readOnly}
                                className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                value={(node.config as SourceConfig).connectionId}
                                onChange={e => updateTransformationConfig(node.id, { connectionId: e.target.value })}
                            >
                                <option value="">Select Connection</option>
                                {connections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    disabled={readOnly}
                                    checked={(node.config as SourceConfig).deleteAfterRead !== false}
                                    onChange={e => updateTransformationConfig(node.id, { deleteAfterRead: e.target.checked })}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                                />
                                <span className="text-xs text-gray-700">
                                    Delete source file after read
                                    <span className="text-gray-400 ml-1">(uncheck to keep)</span>
                                </span>
                            </label>
                        </div>
                    </div>
                )}
                {/* ... (Other configs would follow similar pattern) ... */}
                {/* For safety in this fix, I'm including the full content I read earlier, but applying readOnly props to inputs */}

                {node.type === 'filter' && (
                    <div>
                        <label className="block text-xs text-gray-500">フィルター条件 (JavaScript式)</label>
                        <input
                            disabled={readOnly}
                            className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                            placeholder="例: amount > 100"
                            value={(node.config as FilterConfig).condition}
                            onChange={e => updateTransformationConfig(node.id, { condition: e.target.value })}
                        />
                    </div>
                )}

                {/* Target */}
                {node.type === 'target' && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-gray-500">接続先</label>
                            <select
                                disabled={readOnly}
                                className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                value={(node.config as TargetConfig).connectionId}
                                onChange={e => updateTransformationConfig(node.id, { connectionId: e.target.value })}
                            >
                                <option value="">接続を選択</option>
                                {connections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    disabled={readOnly}
                                    checked={(node.config as TargetConfig).truncate || false}
                                    onChange={e => updateTransformationConfig(node.id, { truncate: e.target.checked })}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                                />
                                <span className="text-xs text-gray-700">ターゲットテーブルをTRUNCATE</span>
                            </label>
                        </div>
                    </div>
                )}

                {/* Union */}
                {node.type === 'union' && (
                    <div className="text-sm text-gray-500">
                        Union変換は設定不要です。複数の入力を結合します。
                    </div>
                )}

                {/* Sequence */}
                {node.type === 'sequence' && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-gray-500">シーケンスフィールド名</label>
                            <input
                                disabled={readOnly}
                                className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                placeholder="seq"
                                value={(node.config as SequenceConfig).sequenceField}
                                onChange={e => updateTransformationConfig(node.id, { sequenceField: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs text-gray-500">開始値</label>
                                <input
                                    type="number"
                                    disabled={readOnly}
                                    className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                    value={(node.config as SequenceConfig).startValue}
                                    onChange={e => updateTransformationConfig(node.id, { startValue: parseInt(e.target.value) || 1 })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500">増分</label>
                                <input
                                    type="number"
                                    disabled={readOnly}
                                    className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                    value={(node.config as SequenceConfig).incrementBy}
                                    onChange={e => updateTransformationConfig(node.id, { incrementBy: parseInt(e.target.value) || 1 })}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Deduplicator */}
                {node.type === 'deduplicator' && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">重複除去キー</label>
                            {(node.config as DeduplicatorConfig).keys.map((key, idx) => (
                                <div key={idx} className="flex gap-2 items-center mb-2">
                                    <input
                                        disabled={readOnly}
                                        className="flex-1 border rounded p-1 text-sm disabled:bg-gray-100"
                                        placeholder="フィールド名"
                                        value={key}
                                        onChange={e => {
                                            const newKeys = [...(node.config as DeduplicatorConfig).keys];
                                            newKeys[idx] = e.target.value;
                                            updateTransformationConfig(node.id, { keys: newKeys });
                                        }}
                                    />
                                    {!readOnly && (
                                        <button
                                            onClick={() => {
                                                const newKeys = (node.config as DeduplicatorConfig).keys.filter((_, i) => i !== idx);
                                                updateTransformationConfig(node.id, { keys: newKeys });
                                            }}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {!readOnly && (
                                <button
                                    onClick={() => {
                                        updateTransformationConfig(node.id, { keys: [...(node.config as DeduplicatorConfig).keys, ''] });
                                    }}
                                    className="text-blue-600 text-xs hover:underline flex items-center gap-1"
                                >
                                    <Plus size={12} /> キーを追加
                                </button>
                            )}
                        </div>
                        <div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    disabled={readOnly}
                                    checked={(node.config as DeduplicatorConfig).caseInsensitive}
                                    onChange={e => updateTransformationConfig(node.id, { caseInsensitive: e.target.checked })}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                                />
                                <span className="text-xs text-gray-700">大文字小文字を区別しない</span>
                            </label>
                        </div>
                    </div>
                )}

                {/* Expression */}
                {node.type === 'expression' && (
                    <div className="space-y-3">
                        <label className="block text-xs text-gray-500 mb-1">フィールド式</label>
                        {(node.config as ExpressionConfig).fields.map((field: FieldExpression, idx) => (
                            <div key={idx} className="border p-2 rounded bg-gray-50 space-y-2 mb-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-medium">フィールド {idx + 1}</span>
                                    {!readOnly && (
                                        <button
                                            onClick={() => {
                                                const newFields = (node.config as ExpressionConfig).fields.filter((_, i) => i !== idx);
                                                updateTransformationConfig(node.id, { fields: newFields });
                                            }}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                                <input
                                    disabled={readOnly}
                                    className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                    placeholder="フィールド名"
                                    value={field.name}
                                    onChange={e => {
                                        const newFields = [...(node.config as ExpressionConfig).fields];
                                        newFields[idx] = { ...field, name: e.target.value };
                                        updateTransformationConfig(node.id, { fields: newFields });
                                    }}
                                />
                                <input
                                    disabled={readOnly}
                                    className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                    placeholder="式 (例: amount * 1.1)"
                                    value={field.expression}
                                    onChange={e => {
                                        const newFields = [...(node.config as ExpressionConfig).fields];
                                        newFields[idx] = { ...field, expression: e.target.value };
                                        updateTransformationConfig(node.id, { fields: newFields });
                                    }}
                                />
                            </div>
                        ))}
                        {!readOnly && (
                            <button
                                onClick={() => {
                                    updateTransformationConfig(node.id, {
                                        fields: [...(node.config as ExpressionConfig).fields, { name: '', expression: '' }]
                                    });
                                }}
                                className="text-blue-600 text-xs hover:underline flex items-center gap-1"
                            >
                                <Plus size={12} /> フィールドを追加
                            </button>
                        )}
                    </div>
                )}

                {/* Aggregator */}
                {node.type === 'aggregator' && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">グループ化フィールド</label>
                            {(node.config as AggregatorConfig).groupBy.map((field, idx) => (
                                <div key={idx} className="flex gap-2 items-center mb-2">
                                    <input
                                        disabled={readOnly}
                                        className="flex-1 border rounded p-1 text-sm disabled:bg-gray-100"
                                        placeholder="フィールド名"
                                        value={field}
                                        onChange={e => {
                                            const newGroupBy = [...(node.config as AggregatorConfig).groupBy];
                                            newGroupBy[idx] = e.target.value;
                                            updateTransformationConfig(node.id, { groupBy: newGroupBy });
                                        }}
                                    />
                                    {!readOnly && (
                                        <button
                                            onClick={() => {
                                                const newGroupBy = (node.config as AggregatorConfig).groupBy.filter((_, i) => i !== idx);
                                                updateTransformationConfig(node.id, { groupBy: newGroupBy });
                                            }}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {!readOnly && (
                                <button
                                    onClick={() => {
                                        updateTransformationConfig(node.id, { groupBy: [...(node.config as AggregatorConfig).groupBy, ''] });
                                    }}
                                    className="text-blue-600 text-xs hover:underline flex items-center gap-1"
                                >
                                    <Plus size={12} /> グループ化フィールドを追加
                                </button>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">集計フィールド</label>
                            {(node.config as AggregatorConfig).aggregates.map((agg: AggregateField, idx) => (
                                <div key={idx} className="border p-2 rounded bg-gray-50 space-y-2 mb-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-medium">集計 {idx + 1}</span>
                                        {!readOnly && (
                                            <button
                                                onClick={() => {
                                                    const newAggs = (node.config as AggregatorConfig).aggregates.filter((_, i) => i !== idx);
                                                    updateTransformationConfig(node.id, { aggregates: newAggs });
                                                }}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                    <input
                                        disabled={readOnly}
                                        className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                        placeholder="出力フィールド名"
                                        value={agg.name}
                                        onChange={e => {
                                            const newAggs = [...(node.config as AggregatorConfig).aggregates];
                                            newAggs[idx] = { ...agg, name: e.target.value };
                                            updateTransformationConfig(node.id, { aggregates: newAggs });
                                        }}
                                    />
                                    <select
                                        disabled={readOnly}
                                        className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                        value={agg.function}
                                        onChange={e => {
                                            const newAggs = [...(node.config as AggregatorConfig).aggregates];
                                            newAggs[idx] = { ...agg, function: e.target.value as 'sum' | 'count' | 'avg' | 'min' | 'max' };
                                            updateTransformationConfig(node.id, { aggregates: newAggs });
                                        }}
                                    >
                                        <option value="sum">SUM</option>
                                        <option value="count">COUNT</option>
                                        <option value="avg">AVG</option>
                                        <option value="min">MIN</option>
                                        <option value="max">MAX</option>
                                    </select>
                                    <input
                                        disabled={readOnly}
                                        className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                        placeholder="対象フィールド"
                                        value={agg.field}
                                        onChange={e => {
                                            const newAggs = [...(node.config as AggregatorConfig).aggregates];
                                            newAggs[idx] = { ...agg, field: e.target.value };
                                            updateTransformationConfig(node.id, { aggregates: newAggs });
                                        }}
                                    />
                                </div>
                            ))}
                            {!readOnly && (
                                <button
                                    onClick={() => {
                                        updateTransformationConfig(node.id, {
                                            aggregates: [...(node.config as AggregatorConfig).aggregates, { name: '', function: 'sum', field: '' } as AggregateField]
                                        });
                                    }}
                                    className="text-blue-600 text-xs hover:underline flex items-center gap-1"
                                >
                                    <Plus size={12} /> 集計を追加
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Sorter */}
                {node.type === 'sorter' && (
                    <div className="space-y-3">
                        <label className="block text-xs text-gray-500 mb-1">ソートフィールド</label>
                        {(node.config as SorterConfig).sortFields.map((sortField: SortField, idx) => (
                            <div key={idx} className="border p-2 rounded bg-gray-50 space-y-2 mb-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-medium">ソート {idx + 1}</span>
                                    {!readOnly && (
                                        <button
                                            onClick={() => {
                                                const newFields = (node.config as SorterConfig).sortFields.filter((_, i) => i !== idx);
                                                updateTransformationConfig(node.id, { sortFields: newFields });
                                            }}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                                <input
                                    disabled={readOnly}
                                    className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                    placeholder="フィールド名"
                                    value={sortField.field}
                                    onChange={e => {
                                        const newFields = [...(node.config as SorterConfig).sortFields];
                                        newFields[idx] = { ...sortField, field: e.target.value };
                                        updateTransformationConfig(node.id, { sortFields: newFields });
                                    }}
                                />
                                <select
                                    disabled={readOnly}
                                    className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                    value={sortField.direction}
                                    onChange={e => {
                                        const newFields = [...(node.config as SorterConfig).sortFields];
                                        newFields[idx] = { ...sortField, direction: e.target.value as 'asc' | 'desc' };
                                        updateTransformationConfig(node.id, { sortFields: newFields });
                                    }}
                                >
                                    <option value="asc">昇順 (ASC)</option>
                                    <option value="desc">降順 (DESC)</option>
                                </select>
                            </div>
                        ))}
                        {!readOnly && (
                            <button
                                onClick={() => {
                                    updateTransformationConfig(node.id, {
                                        sortFields: [...(node.config as SorterConfig).sortFields, { field: '', direction: 'asc' } as SortField]
                                    });
                                }}
                                className="text-blue-600 text-xs hover:underline flex items-center gap-1"
                            >
                                <Plus size={12} /> ソートフィールドを追加
                            </button>
                        )}
                    </div>
                )}

                {/* Normalizer */}
                {node.type === 'normalizer' && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-gray-500">配列フィールド</label>
                            <input
                                disabled={readOnly}
                                className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                placeholder="正規化する配列フィールド名"
                                value={(node.config as NormalizerConfig).arrayField}
                                onChange={e => updateTransformationConfig(node.id, { arrayField: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">出力フィールド</label>
                            {(node.config as NormalizerConfig).outputFields.map((field, idx) => (
                                <div key={idx} className="flex gap-2 items-center mb-2">
                                    <input
                                        disabled={readOnly}
                                        className="flex-1 border rounded p-1 text-sm disabled:bg-gray-100"
                                        placeholder="フィールド名"
                                        value={field}
                                        onChange={e => {
                                            const newFields = [...(node.config as NormalizerConfig).outputFields];
                                            newFields[idx] = e.target.value;
                                            updateTransformationConfig(node.id, { outputFields: newFields });
                                        }}
                                    />
                                    {!readOnly && (
                                        <button
                                            onClick={() => {
                                                const newFields = (node.config as NormalizerConfig).outputFields.filter((_, i) => i !== idx);
                                                updateTransformationConfig(node.id, { outputFields: newFields });
                                            }}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {!readOnly && (
                                <button
                                    onClick={() => {
                                        updateTransformationConfig(node.id, { outputFields: [...(node.config as NormalizerConfig).outputFields, ''] });
                                    }}
                                    className="text-blue-600 text-xs hover:underline flex items-center gap-1"
                                >
                                    <Plus size={12} /> フィールドを追加
                                </button>
                            )}
                        </div>
                        <div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    disabled={readOnly}
                                    checked={(node.config as NormalizerConfig).keepOriginalFields}
                                    onChange={e => updateTransformationConfig(node.id, { keepOriginalFields: e.target.checked })}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                                />
                                <span className="text-xs text-gray-700">元のフィールドを保持</span>
                            </label>
                        </div>
                    </div>
                )}

                {/* Cleansing */}
                {node.type === 'cleansing' && (
                    <div className="space-y-3">
                        <label className="block text-xs text-gray-500 mb-1">クレンジングルール</label>
                        {(node.config as CleansingConfig).rules.map((rule: CleansingRule, idx) => (
                            <div key={idx} className="border p-2 rounded bg-gray-50 space-y-2 mb-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-medium">ルール {idx + 1}</span>
                                    {!readOnly && (
                                        <button
                                            onClick={() => {
                                                const newRules = (node.config as CleansingConfig).rules.filter((_, i) => i !== idx);
                                                updateTransformationConfig(node.id, { rules: newRules });
                                            }}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                                <input
                                    disabled={readOnly}
                                    className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                    placeholder="フィールド名"
                                    value={rule.field}
                                    onChange={e => {
                                        const newRules = [...(node.config as CleansingConfig).rules];
                                        newRules[idx] = { ...rule, field: e.target.value };
                                        updateTransformationConfig(node.id, { rules: newRules });
                                    }}
                                />
                                <select
                                    disabled={readOnly}
                                    className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                    value={rule.operation}
                                    onChange={e => {
                                        const newRules = [...(node.config as CleansingConfig).rules];
                                        newRules[idx] = { ...rule, operation: e.target.value as 'trim' | 'upper' | 'lower' | 'nullToDefault' | 'replace' };
                                        updateTransformationConfig(node.id, { rules: newRules });
                                    }}
                                >
                                    <option value="trim">空白削除 (TRIM)</option>
                                    <option value="upper">大文字変換 (UPPER)</option>
                                    <option value="lower">小文字変換 (LOWER)</option>
                                    <option value="nullToDefault">NULL→デフォルト値</option>
                                    <option value="replace">置換 (REPLACE)</option>
                                </select>
                                {rule.operation === 'nullToDefault' && (
                                    <input
                                        disabled={readOnly}
                                        className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                        placeholder="デフォルト値"
                                        value={rule.defaultValue || ''}
                                        onChange={e => {
                                            const newRules = [...(node.config as CleansingConfig).rules];
                                            newRules[idx] = { ...rule, defaultValue: e.target.value };
                                            updateTransformationConfig(node.id, { rules: newRules });
                                        }}
                                    />
                                )}
                                {rule.operation === 'replace' && (
                                    <>
                                        <input
                                            disabled={readOnly}
                                            className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                            placeholder="置換パターン (正規表現)"
                                            value={rule.replacePattern || ''}
                                            onChange={e => {
                                                const newRules = [...(node.config as CleansingConfig).rules];
                                                newRules[idx] = { ...rule, replacePattern: e.target.value };
                                                updateTransformationConfig(node.id, { rules: newRules });
                                            }}
                                        />
                                        <input
                                            disabled={readOnly}
                                            className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                            placeholder="置換後の値"
                                            value={rule.replaceWith || ''}
                                            onChange={e => {
                                                const newRules = [...(node.config as CleansingConfig).rules];
                                                newRules[idx] = { ...rule, replaceWith: e.target.value };
                                                updateTransformationConfig(node.id, { rules: newRules });
                                            }}
                                        />
                                    </>
                                )}
                            </div>
                        ))}
                        {!readOnly && (
                            <button
                                onClick={() => {
                                    updateTransformationConfig(node.id, {
                                        rules: [...(node.config as CleansingConfig).rules, { field: '', operation: 'trim' } as CleansingRule]
                                    });
                                }}
                                className="text-blue-600 text-xs hover:underline flex items-center gap-1"
                            >
                                <Plus size={12} /> ルールを追加
                            </button>
                        )}
                    </div>
                )}

                {/* Pivot */}
                {node.type === 'pivot' && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">グループ化フィールド</label>
                            {(node.config as PivotConfig).groupByFields.map((field, idx) => (
                                <div key={idx} className="flex gap-2 items-center mb-2">
                                    <input
                                        disabled={readOnly}
                                        className="flex-1 border rounded p-1 text-sm disabled:bg-gray-100"
                                        placeholder="フィールド名"
                                        value={field}
                                        onChange={e => {
                                            const newFields = [...(node.config as PivotConfig).groupByFields];
                                            newFields[idx] = e.target.value;
                                            updateTransformationConfig(node.id, { groupByFields: newFields });
                                        }}
                                    />
                                    {!readOnly && (
                                        <button
                                            onClick={() => {
                                                const newFields = (node.config as PivotConfig).groupByFields.filter((_, i) => i !== idx);
                                                updateTransformationConfig(node.id, { groupByFields: newFields });
                                            }}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {!readOnly && (
                                <button
                                    onClick={() => {
                                        updateTransformationConfig(node.id, { groupByFields: [...(node.config as PivotConfig).groupByFields, ''] });
                                    }}
                                    className="text-blue-600 text-xs hover:underline flex items-center gap-1"
                                >
                                    <Plus size={12} /> フィールドを追加
                                </button>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500">ピボットフィールド</label>
                            <input
                                disabled={readOnly}
                                className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                placeholder="列になるフィールド"
                                value={(node.config as PivotConfig).pivotField}
                                onChange={e => updateTransformationConfig(node.id, { pivotField: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500">値フィールド</label>
                            <input
                                disabled={readOnly}
                                className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                placeholder="値になるフィールド"
                                value={(node.config as PivotConfig).valueField}
                                onChange={e => updateTransformationConfig(node.id, { valueField: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                {/* Unpivot */}
                {node.type === 'unpivot' && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">アンピボット対象フィールド</label>
                            {(node.config as UnpivotConfig).fieldsToUnpivot.map((field, idx) => (
                                <div key={idx} className="flex gap-2 items-center mb-2">
                                    <input
                                        disabled={readOnly}
                                        className="flex-1 border rounded p-1 text-sm disabled:bg-gray-100"
                                        placeholder="フィールド名"
                                        value={field}
                                        onChange={e => {
                                            const newFields = [...(node.config as UnpivotConfig).fieldsToUnpivot];
                                            newFields[idx] = e.target.value;
                                            updateTransformationConfig(node.id, { fieldsToUnpivot: newFields });
                                        }}
                                    />
                                    {!readOnly && (
                                        <button
                                            onClick={() => {
                                                const newFields = (node.config as UnpivotConfig).fieldsToUnpivot.filter((_, i) => i !== idx);
                                                updateTransformationConfig(node.id, { fieldsToUnpivot: newFields });
                                            }}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {!readOnly && (
                                <button
                                    onClick={() => {
                                        updateTransformationConfig(node.id, { fieldsToUnpivot: [...(node.config as UnpivotConfig).fieldsToUnpivot, ''] });
                                    }}
                                    className="text-blue-600 text-xs hover:underline flex items-center gap-1"
                                >
                                    <Plus size={12} /> フィールドを追加
                                </button>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500">ヘッダー用フィールド名</label>
                            <input
                                disabled={readOnly}
                                className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                placeholder="Metric"
                                value={(node.config as UnpivotConfig).newHeaderFieldName}
                                onChange={e => updateTransformationConfig(node.id, { newHeaderFieldName: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500">値用フィールド名</label>
                            <input
                                disabled={readOnly}
                                className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                placeholder="Value"
                                value={(node.config as UnpivotConfig).newValueFieldName}
                                onChange={e => updateTransformationConfig(node.id, { newValueFieldName: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                {/* Validator */}
                {node.type === 'validator' && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">検証ルール</label>
                            {(node.config as ValidatorConfig).rules.map((rule: ValidatorRule, idx) => (
                                <div key={idx} className="border p-2 rounded bg-gray-50 space-y-2 mb-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-medium">ルール {idx + 1}</span>
                                        {!readOnly && (
                                            <button
                                                onClick={() => {
                                                    const newRules = (node.config as ValidatorConfig).rules.filter((_, i) => i !== idx);
                                                    updateTransformationConfig(node.id, { rules: newRules });
                                                }}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                    <input
                                        disabled={readOnly}
                                        className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                        placeholder="フィールド名"
                                        value={rule.field}
                                        onChange={e => {
                                            const newRules = [...(node.config as ValidatorConfig).rules];
                                            newRules[idx] = { ...rule, field: e.target.value };
                                            updateTransformationConfig(node.id, { rules: newRules });
                                        }}
                                    />
                                    <select
                                        disabled={readOnly}
                                        className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                        value={rule.type || ''}
                                        onChange={e => {
                                            const newRules = [...(node.config as ValidatorConfig).rules];
                                            newRules[idx] = { ...rule, type: e.target.value as 'string' | 'number' | 'boolean' | undefined };
                                            updateTransformationConfig(node.id, { rules: newRules });
                                        }}
                                    >
                                        <option value="">型指定なし</option>
                                        <option value="string">String</option>
                                        <option value="number">Number</option>
                                        <option value="boolean">Boolean</option>
                                    </select>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            disabled={readOnly}
                                            checked={rule.required || false}
                                            onChange={e => {
                                                const newRules = [...(node.config as ValidatorConfig).rules];
                                                newRules[idx] = { ...rule, required: e.target.checked };
                                                updateTransformationConfig(node.id, { rules: newRules });
                                            }}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                                        />
                                        <span className="text-xs text-gray-700">必須</span>
                                    </label>
                                    <input
                                        disabled={readOnly}
                                        className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                        placeholder="正規表現パターン (オプション)"
                                        value={rule.regex || ''}
                                        onChange={e => {
                                            const newRules = [...(node.config as ValidatorConfig).rules];
                                            newRules[idx] = { ...rule, regex: e.target.value };
                                            updateTransformationConfig(node.id, { rules: newRules });
                                        }}
                                    />
                                </div>
                            ))}
                            {!readOnly && (
                                <button
                                    onClick={() => {
                                        updateTransformationConfig(node.id, {
                                            rules: [...(node.config as ValidatorConfig).rules, { field: '' } as ValidatorRule]
                                        });
                                    }}
                                    className="text-blue-600 text-xs hover:underline flex items-center gap-1"
                                >
                                    <Plus size={12} /> ルールを追加
                                </button>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500">エラー時の動作</label>
                            <select
                                disabled={readOnly}
                                className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                value={(node.config as ValidatorConfig).errorBehavior}
                                onChange={e => updateTransformationConfig(node.id, { errorBehavior: e.target.value as 'skip' | 'error' })}
                            >
                                <option value="skip">スキップ (Skip)</option>
                                <option value="error">エラー (Error)</option>
                            </select>
                        </div>
                    </div>
                )}

                {/* Joiner */}
                {node.type === 'joiner' && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-gray-500">結合タイプ</label>
                            <select
                                disabled={readOnly}
                                className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                value={(node.config as JoinerConfig).joinType}
                                onChange={e => updateTransformationConfig(node.id, { joinType: e.target.value as 'inner' | 'left' | 'right' | 'full' })}
                            >
                                <option value="inner">INNER JOIN</option>
                                <option value="left">LEFT JOIN</option>
                                <option value="right">RIGHT JOIN</option>
                                <option value="full">FULL JOIN</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">マスターキー</label>
                            {(node.config as JoinerConfig).masterKeys.map((key, idx) => (
                                <div key={idx} className="flex gap-2 items-center mb-2">
                                    <input
                                        disabled={readOnly}
                                        className="flex-1 border rounded p-1 text-sm disabled:bg-gray-100"
                                        placeholder="フィールド名"
                                        value={key}
                                        onChange={e => {
                                            const newKeys = [...(node.config as JoinerConfig).masterKeys];
                                            newKeys[idx] = e.target.value;
                                            updateTransformationConfig(node.id, { masterKeys: newKeys });
                                        }}
                                    />
                                    {!readOnly && (
                                        <button
                                            onClick={() => {
                                                const newKeys = (node.config as JoinerConfig).masterKeys.filter((_, i) => i !== idx);
                                                updateTransformationConfig(node.id, { masterKeys: newKeys });
                                            }}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {!readOnly && (
                                <button
                                    onClick={() => {
                                        updateTransformationConfig(node.id, { masterKeys: [...(node.config as JoinerConfig).masterKeys, ''] });
                                    }}
                                    className="text-blue-600 text-xs hover:underline flex items-center gap-1"
                                >
                                    <Plus size={12} /> キーを追加
                                </button>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">詳細キー</label>
                            {(node.config as JoinerConfig).detailKeys.map((key, idx) => (
                                <div key={idx} className="flex gap-2 items-center mb-2">
                                    <input
                                        disabled={readOnly}
                                        className="flex-1 border rounded p-1 text-sm disabled:bg-gray-100"
                                        placeholder="フィールド名"
                                        value={key}
                                        onChange={e => {
                                            const newKeys = [...(node.config as JoinerConfig).detailKeys];
                                            newKeys[idx] = e.target.value;
                                            updateTransformationConfig(node.id, { detailKeys: newKeys });
                                        }}
                                    />
                                    {!readOnly && (
                                        <button
                                            onClick={() => {
                                                const newKeys = (node.config as JoinerConfig).detailKeys.filter((_, i) => i !== idx);
                                                updateTransformationConfig(node.id, { detailKeys: newKeys });
                                            }}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {!readOnly && (
                                <button
                                    onClick={() => {
                                        updateTransformationConfig(node.id, { detailKeys: [...(node.config as JoinerConfig).detailKeys, ''] });
                                    }}
                                    className="text-blue-600 text-xs hover:underline flex items-center gap-1"
                                >
                                    <Plus size={12} /> キーを追加
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Lookup */}
                {node.type === 'lookup' && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-gray-500">ルックアップ接続</label>
                            <select
                                disabled={readOnly}
                                className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                value={(node.config as LookupConfig).connectionId}
                                onChange={e => updateTransformationConfig(node.id, { connectionId: e.target.value })}
                            >
                                <option value="">接続を選択</option>
                                {connections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">ルックアップキー</label>
                            {(node.config as LookupConfig).lookupKeys.map((key, idx) => (
                                <div key={idx} className="flex gap-2 items-center mb-2">
                                    <input
                                        disabled={readOnly}
                                        className="flex-1 border rounded p-1 text-sm disabled:bg-gray-100"
                                        placeholder="入力フィールド"
                                        value={key}
                                        onChange={e => {
                                            const newKeys = [...(node.config as LookupConfig).lookupKeys];
                                            newKeys[idx] = e.target.value;
                                            updateTransformationConfig(node.id, { lookupKeys: newKeys });
                                        }}
                                    />
                                    {!readOnly && (
                                        <button
                                            onClick={() => {
                                                const newKeys = (node.config as LookupConfig).lookupKeys.filter((_, i) => i !== idx);
                                                updateTransformationConfig(node.id, { lookupKeys: newKeys });
                                            }}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {!readOnly && (
                                <button
                                    onClick={() => {
                                        updateTransformationConfig(node.id, { lookupKeys: [...(node.config as LookupConfig).lookupKeys, ''] });
                                    }}
                                    className="text-blue-600 text-xs hover:underline flex items-center gap-1"
                                >
                                    <Plus size={12} /> キーを追加
                                </button>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">参照キー</label>
                            {(node.config as LookupConfig).referenceKeys.map((key, idx) => (
                                <div key={idx} className="flex gap-2 items-center mb-2">
                                    <input
                                        disabled={readOnly}
                                        className="flex-1 border rounded p-1 text-sm disabled:bg-gray-100"
                                        placeholder="参照テーブルのフィールド"
                                        value={key}
                                        onChange={e => {
                                            const newKeys = [...(node.config as LookupConfig).referenceKeys];
                                            newKeys[idx] = e.target.value;
                                            updateTransformationConfig(node.id, { referenceKeys: newKeys });
                                        }}
                                    />
                                    {!readOnly && (
                                        <button
                                            onClick={() => {
                                                const newKeys = (node.config as LookupConfig).referenceKeys.filter((_, i) => i !== idx);
                                                updateTransformationConfig(node.id, { referenceKeys: newKeys });
                                            }}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {!readOnly && (
                                <button
                                    onClick={() => {
                                        updateTransformationConfig(node.id, { referenceKeys: [...(node.config as LookupConfig).referenceKeys, ''] });
                                    }}
                                    className="text-blue-600 text-xs hover:underline flex items-center gap-1"
                                >
                                    <Plus size={12} /> キーを追加
                                </button>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">返却フィールド</label>
                            {(node.config as LookupConfig).returnFields.map((field, idx) => (
                                <div key={idx} className="flex gap-2 items-center mb-2">
                                    <input
                                        disabled={readOnly}
                                        className="flex-1 border rounded p-1 text-sm disabled:bg-gray-100"
                                        placeholder="フィールド名"
                                        value={field}
                                        onChange={e => {
                                            const newFields = [...(node.config as LookupConfig).returnFields];
                                            newFields[idx] = e.target.value;
                                            updateTransformationConfig(node.id, { returnFields: newFields });
                                        }}
                                    />
                                    {!readOnly && (
                                        <button
                                            onClick={() => {
                                                const newFields = (node.config as LookupConfig).returnFields.filter((_, i) => i !== idx);
                                                updateTransformationConfig(node.id, { returnFields: newFields });
                                            }}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {!readOnly && (
                                <button
                                    onClick={() => {
                                        updateTransformationConfig(node.id, { returnFields: [...(node.config as LookupConfig).returnFields, ''] });
                                    }}
                                    className="text-blue-600 text-xs hover:underline flex items-center gap-1"
                                >
                                    <Plus size={12} /> フィールドを追加
                                </button>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500">デフォルト値</label>
                            <input
                                disabled={readOnly}
                                className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                placeholder="見つからない場合のデフォルト値"
                                value={(node.config as LookupConfig).defaultValue || ''}
                                onChange={e => updateTransformationConfig(node.id, { defaultValue: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                {/* Router */}
                {node.type === 'router' && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">ルーティングルール</label>
                            {(node.config as RouterConfig).routes.map((route: RouterRoute, idx) => (
                                <div key={idx} className="border p-2 rounded bg-gray-50 space-y-2 mb-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-medium">ルート {idx + 1}</span>
                                        {!readOnly && (
                                            <button
                                                onClick={() => {
                                                    const newRoutes = (node.config as RouterConfig).routes.filter((_, i) => i !== idx);
                                                    updateTransformationConfig(node.id, { routes: newRoutes });
                                                }}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                    <input
                                        disabled={readOnly}
                                        className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                        placeholder="グループ名"
                                        value={route.groupName}
                                        onChange={e => {
                                            const newRoutes = [...(node.config as RouterConfig).routes];
                                            newRoutes[idx] = { ...route, groupName: e.target.value };
                                            updateTransformationConfig(node.id, { routes: newRoutes });
                                        }}
                                    />
                                    <input
                                        disabled={readOnly}
                                        className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                        placeholder="条件 (例: status === 'active')"
                                        value={route.condition}
                                        onChange={e => {
                                            const newRoutes = [...(node.config as RouterConfig).routes];
                                            newRoutes[idx] = { ...route, condition: e.target.value };
                                            updateTransformationConfig(node.id, { routes: newRoutes });
                                        }}
                                    />
                                </div>
                            ))}
                            {!readOnly && (
                                <button
                                    onClick={() => {
                                        updateTransformationConfig(node.id, {
                                            routes: [...(node.config as RouterConfig).routes, { condition: '', groupName: '' } as RouterRoute]
                                        });
                                    }}
                                    className="text-blue-600 text-xs hover:underline flex items-center gap-1"
                                >
                                    <Plus size={12} /> ルートを追加
                                </button>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500">デフォルトグループ</label>
                            <input
                                disabled={readOnly}
                                className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                placeholder="default"
                                value={(node.config as RouterConfig).defaultGroup}
                                onChange={e => updateTransformationConfig(node.id, { defaultGroup: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                {/* Rank */}
                {node.type === 'rank' && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">パーティションフィールド</label>
                            {(node.config as RankConfig).partitionBy.map((field, idx) => (
                                <div key={idx} className="flex gap-2 items-center mb-2">
                                    <input
                                        disabled={readOnly}
                                        className="flex-1 border rounded p-1 text-sm disabled:bg-gray-100"
                                        placeholder="フィールド名"
                                        value={field}
                                        onChange={e => {
                                            const newFields = [...(node.config as RankConfig).partitionBy];
                                            newFields[idx] = e.target.value;
                                            updateTransformationConfig(node.id, { partitionBy: newFields });
                                        }}
                                    />
                                    {!readOnly && (
                                        <button
                                            onClick={() => {
                                                const newFields = (node.config as RankConfig).partitionBy.filter((_, i) => i !== idx);
                                                updateTransformationConfig(node.id, { partitionBy: newFields });
                                            }}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {!readOnly && (
                                <button
                                    onClick={() => {
                                        updateTransformationConfig(node.id, { partitionBy: [...(node.config as RankConfig).partitionBy, ''] });
                                    }}
                                    className="text-blue-600 text-xs hover:underline flex items-center gap-1"
                                >
                                    <Plus size={12} /> パーティションフィールドを追加
                                </button>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">順序フィールド</label>
                            {(node.config as RankConfig).orderBy.map((orderField, idx) => (
                                <div key={idx} className="border p-2 rounded bg-gray-50 space-y-2 mb-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-medium">順序 {idx + 1}</span>
                                        {!readOnly && (
                                            <button
                                                onClick={() => {
                                                    const newFields = (node.config as RankConfig).orderBy.filter((_, i) => i !== idx);
                                                    updateTransformationConfig(node.id, { orderBy: newFields });
                                                }}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                    <input
                                        disabled={readOnly}
                                        className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                        placeholder="フィールド名"
                                        value={orderField.field}
                                        onChange={e => {
                                            const newFields = [...(node.config as RankConfig).orderBy];
                                            newFields[idx] = { ...orderField, field: e.target.value };
                                            updateTransformationConfig(node.id, { orderBy: newFields });
                                        }}
                                    />
                                    <select
                                        disabled={readOnly}
                                        className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                        value={orderField.direction}
                                        onChange={e => {
                                            const newFields = [...(node.config as RankConfig).orderBy];
                                            newFields[idx] = { ...orderField, direction: e.target.value as 'asc' | 'desc' };
                                            updateTransformationConfig(node.id, { orderBy: newFields });
                                        }}
                                    >
                                        <option value="asc">昇順 (ASC)</option>
                                        <option value="desc">降順 (DESC)</option>
                                    </select>
                                </div>
                            ))}
                            {!readOnly && (
                                <button
                                    onClick={() => {
                                        updateTransformationConfig(node.id, {
                                            orderBy: [...(node.config as RankConfig).orderBy, { field: '', direction: 'asc' }]
                                        });
                                    }}
                                    className="text-blue-600 text-xs hover:underline flex items-center gap-1"
                                >
                                    <Plus size={12} /> 順序フィールドを追加
                                </button>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500">ランクフィールド名</label>
                            <input
                                disabled={readOnly}
                                className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                placeholder="rank"
                                value={(node.config as RankConfig).rankField}
                                onChange={e => updateTransformationConfig(node.id, { rankField: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500">ランクタイプ</label>
                            <select
                                disabled={readOnly}
                                className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                value={(node.config as RankConfig).rankType}
                                onChange={e => updateTransformationConfig(node.id, { rankType: e.target.value as 'rank' | 'denseRank' | 'rowNumber' })}
                            >
                                <option value="rank">RANK</option>
                                <option value="denseRank">DENSE_RANK</option>
                                <option value="rowNumber">ROW_NUMBER</option>
                            </select>
                        </div>
                    </div>
                )}

                {/* Update Strategy */}
                {node.type === 'updateStrategy' && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-gray-500">戦略フィールド名</label>
                            <input
                                disabled={readOnly}
                                className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                placeholder="_strategy"
                                value={(node.config as UpdateStrategyConfig).strategyField}
                                onChange={e => updateTransformationConfig(node.id, { strategyField: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500">デフォルト戦略</label>
                            <select
                                disabled={readOnly}
                                className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                value={(node.config as UpdateStrategyConfig).defaultStrategy}
                                onChange={e => updateTransformationConfig(node.id, { defaultStrategy: e.target.value as 'insert' | 'update' | 'delete' | 'reject' })}
                            >
                                <option value="insert">INSERT</option>
                                <option value="update">UPDATE</option>
                                <option value="delete">DELETE</option>
                                <option value="reject">REJECT</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">条件別戦略</label>
                            {(node.config as UpdateStrategyConfig).conditions.map((cond, idx) => (
                                <div key={idx} className="border p-2 rounded bg-gray-50 space-y-2 mb-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-medium">条件 {idx + 1}</span>
                                        {!readOnly && (
                                            <button
                                                onClick={() => {
                                                    const newConds = (node.config as UpdateStrategyConfig).conditions.filter((_, i) => i !== idx);
                                                    updateTransformationConfig(node.id, { conditions: newConds });
                                                }}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                    <input
                                        disabled={readOnly}
                                        className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                        placeholder="条件 (例: status === 'new')"
                                        value={cond.condition}
                                        onChange={e => {
                                            const newConds = [...(node.config as UpdateStrategyConfig).conditions];
                                            newConds[idx] = { ...cond, condition: e.target.value };
                                            updateTransformationConfig(node.id, { conditions: newConds });
                                        }}
                                    />
                                    <select
                                        disabled={readOnly}
                                        className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                        value={cond.strategy}
                                        onChange={e => {
                                            const newConds = [...(node.config as UpdateStrategyConfig).conditions];
                                            newConds[idx] = { ...cond, strategy: e.target.value as 'insert' | 'update' | 'delete' | 'reject' };
                                            updateTransformationConfig(node.id, { conditions: newConds });
                                        }}
                                    >
                                        <option value="insert">INSERT</option>
                                        <option value="update">UPDATE</option>
                                        <option value="delete">DELETE</option>
                                        <option value="reject">REJECT</option>
                                    </select>
                                </div>
                            ))}
                            {!readOnly && (
                                <button
                                    onClick={() => {
                                        updateTransformationConfig(node.id, {
                                            conditions: [...(node.config as UpdateStrategyConfig).conditions, { condition: '', strategy: 'insert' as const }]
                                        });
                                    }}
                                    className="text-blue-600 text-xs hover:underline flex items-center gap-1"
                                >
                                    <Plus size={12} /> 条件を追加
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* SQL */}
                {node.type === 'sql' && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-gray-500">SQLクエリ</label>
                            <textarea
                                disabled={readOnly}
                                className="w-full border rounded p-1 text-sm disabled:bg-gray-100 font-mono"
                                placeholder="SELECT * FROM input WHERE amount > 100"
                                rows={5}
                                value={(node.config as SqlConfig).sqlQuery}
                                onChange={e => updateTransformationConfig(node.id, { sqlQuery: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500">モード</label>
                            <select
                                disabled={readOnly}
                                className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                value={(node.config as SqlConfig).mode}
                                onChange={e => updateTransformationConfig(node.id, { mode: e.target.value as 'query' | 'procedure' | 'script' })}
                            >
                                <option value="query">クエリ (Query)</option>
                                <option value="procedure">プロシージャ (Procedure)</option>
                                <option value="script">スクリプト (Script)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500">DB接続 (オプション)</label>
                            <select
                                disabled={readOnly}
                                className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                value={(node.config as SqlConfig).dbConnectionId || ''}
                                onChange={e => updateTransformationConfig(node.id, { dbConnectionId: e.target.value })}
                            >
                                <option value="">接続なし (メモリ内)</option>
                                {connections.filter(c => c.type === 'database').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>
                )}

                {/* Web Service */}
                {node.type === 'webService' && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-gray-500">URL</label>
                            <input
                                disabled={readOnly}
                                className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                placeholder="http://api.example.com/data"
                                value={(node.config as WebServiceConfig).url}
                                onChange={e => updateTransformationConfig(node.id, { url: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500">HTTPメソッド</label>
                            <select
                                disabled={readOnly}
                                className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                value={(node.config as WebServiceConfig).method}
                                onChange={e => updateTransformationConfig(node.id, { method: e.target.value as 'GET' | 'POST' | 'PUT' | 'DELETE' })}
                            >
                                <option value="GET">GET</option>
                                <option value="POST">POST</option>
                                <option value="PUT">PUT</option>
                                <option value="DELETE">DELETE</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">ヘッダー</label>
                            {(node.config as WebServiceConfig).headers.map((header, idx) => (
                                <div key={idx} className="border p-2 rounded bg-gray-50 space-y-2 mb-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-medium">ヘッダー {idx + 1}</span>
                                        {!readOnly && (
                                            <button
                                                onClick={() => {
                                                    const newHeaders = (node.config as WebServiceConfig).headers.filter((_, i) => i !== idx);
                                                    updateTransformationConfig(node.id, { headers: newHeaders });
                                                }}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                    <input
                                        disabled={readOnly}
                                        className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                        placeholder="キー (例: Authorization)"
                                        value={header.key}
                                        onChange={e => {
                                            const newHeaders = [...(node.config as WebServiceConfig).headers];
                                            newHeaders[idx] = { ...header, key: e.target.value };
                                            updateTransformationConfig(node.id, { headers: newHeaders });
                                        }}
                                    />
                                    <input
                                        disabled={readOnly}
                                        className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                        placeholder="値"
                                        value={header.value}
                                        onChange={e => {
                                            const newHeaders = [...(node.config as WebServiceConfig).headers];
                                            newHeaders[idx] = { ...header, value: e.target.value };
                                            updateTransformationConfig(node.id, { headers: newHeaders });
                                        }}
                                    />
                                </div>
                            ))}
                            {!readOnly && (
                                <button
                                    onClick={() => {
                                        updateTransformationConfig(node.id, {
                                            headers: [...(node.config as WebServiceConfig).headers, { key: '', value: '' }]
                                        });
                                    }}
                                    className="text-blue-600 text-xs hover:underline flex items-center gap-1"
                                >
                                    <Plus size={12} /> ヘッダーを追加
                                </button>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500">リクエストボディ (オプション)</label>
                            <textarea
                                disabled={readOnly}
                                className="w-full border rounded p-1 text-sm disabled:bg-gray-100 font-mono"
                                placeholder='{"key": "value"}'
                                rows={3}
                                value={(node.config as WebServiceConfig).requestBody || ''}
                                onChange={e => updateTransformationConfig(node.id, { requestBody: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">レスポンスマッピング</label>
                            {(node.config as WebServiceConfig).responseMap?.map((mapping, idx) => (
                                <div key={idx} className="border p-2 rounded bg-gray-50 space-y-2 mb-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-medium">マッピング {idx + 1}</span>
                                        {!readOnly && (
                                            <button
                                                onClick={() => {
                                                    const newMaps = (node.config as WebServiceConfig).responseMap?.filter((_, i) => i !== idx) || [];
                                                    updateTransformationConfig(node.id, { responseMap: newMaps });
                                                }}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                    <input
                                        disabled={readOnly}
                                        className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                        placeholder="JSONパス (例: $.data.name)"
                                        value={mapping.path}
                                        onChange={e => {
                                            const newMaps = [...((node.config as WebServiceConfig).responseMap || [])];
                                            newMaps[idx] = { ...mapping, path: e.target.value };
                                            updateTransformationConfig(node.id, { responseMap: newMaps });
                                        }}
                                    />
                                    <input
                                        disabled={readOnly}
                                        className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                        placeholder="出力フィールド名"
                                        value={mapping.field}
                                        onChange={e => {
                                            const newMaps = [...((node.config as WebServiceConfig).responseMap || [])];
                                            newMaps[idx] = { ...mapping, field: e.target.value };
                                            updateTransformationConfig(node.id, { responseMap: newMaps });
                                        }}
                                    />
                                </div>
                            )) || null}
                            {!readOnly && (
                                <button
                                    onClick={() => {
                                        updateTransformationConfig(node.id, {
                                            responseMap: [...((node.config as WebServiceConfig).responseMap || []), { path: '', field: '' }]
                                        });
                                    }}
                                    className="text-blue-600 text-xs hover:underline flex items-center gap-1"
                                >
                                    <Plus size={12} /> マッピングを追加
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Hierarchy Parser */}
                {node.type === 'hierarchyParser' && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-gray-500">入力フィールド</label>
                            <input
                                disabled={readOnly}
                                className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                placeholder="JSON階層データを含むフィールド名"
                                value={(node.config as HierarchyParserConfig).inputField}
                                onChange={e => updateTransformationConfig(node.id, { inputField: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">出力フィールド</label>
                            {(node.config as HierarchyParserConfig).outputFields.map((outField, idx) => (
                                <div key={idx} className="border p-2 rounded bg-gray-50 space-y-2 mb-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-medium">フィールド {idx + 1}</span>
                                        {!readOnly && (
                                            <button
                                                onClick={() => {
                                                    const newFields = (node.config as HierarchyParserConfig).outputFields.filter((_, i) => i !== idx);
                                                    updateTransformationConfig(node.id, { outputFields: newFields });
                                                }}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                    <input
                                        disabled={readOnly}
                                        className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                        placeholder="出力フィールド名"
                                        value={outField.name}
                                        onChange={e => {
                                            const newFields = [...(node.config as HierarchyParserConfig).outputFields];
                                            newFields[idx] = { ...outField, name: e.target.value };
                                            updateTransformationConfig(node.id, { outputFields: newFields });
                                        }}
                                    />
                                    <input
                                        disabled={readOnly}
                                        className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                        placeholder="JSONパス (例: $.data.user.id)"
                                        value={outField.path}
                                        onChange={e => {
                                            const newFields = [...(node.config as HierarchyParserConfig).outputFields];
                                            newFields[idx] = { ...outField, path: e.target.value };
                                            updateTransformationConfig(node.id, { outputFields: newFields });
                                        }}
                                    />
                                    <select
                                        disabled={readOnly}
                                        className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                                        value={outField.type}
                                        onChange={e => {
                                            const newFields = [...(node.config as HierarchyParserConfig).outputFields];
                                            newFields[idx] = { ...outField, type: e.target.value as 'string' | 'number' | 'boolean' };
                                            updateTransformationConfig(node.id, { outputFields: newFields });
                                        }}
                                    >
                                        <option value="string">String</option>
                                        <option value="number">Number</option>
                                        <option value="boolean">Boolean</option>
                                    </select>
                                </div>
                            ))}
                            {!readOnly && (
                                <button
                                    onClick={() => {
                                        updateTransformationConfig(node.id, {
                                            outputFields: [...(node.config as HierarchyParserConfig).outputFields, { name: '', path: '', type: 'string' as const }]
                                        });
                                    }}
                                    className="text-blue-600 text-xs hover:underline flex items-center gap-1"
                                >
                                    <Plus size={12} /> フィールドを追加
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    if (editingMapping) {
        return (
            <div className="h-[600px] flex flex-col border rounded bg-white shadow-sm">
                <div className="p-2 border-b flex flex-wrap justify-between items-center bg-gray-50 gap-2">
                    <input
                        disabled={readOnly}
                        className="font-bold bg-transparent border-none focus:ring-0 text-sm min-w-0 flex-grow disabled:text-gray-600"
                        value={editingMapping.name}
                        onChange={e => setEditingMapping({ ...editingMapping, name: e.target.value })}
                    />
                    <div className="flex gap-2 shrink-0">
                        {!readOnly && (
                            <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">
                                <Save size={14} /> <span className="hidden sm:inline">Save</span>
                            </button>
                        )}
                        <button onClick={() => setEditingMapping(null)} className="flex items-center gap-1 px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300">
                            <X size={14} /> <span className="hidden sm:inline">{readOnly ? 'Close' : 'Cancel'}</span>
                        </button>
                    </div>
                </div>

                <div className="flex-grow flex flex-col md:flex-row overflow-hidden relative">
                    {/* Toolbar */}
                    {!readOnly && (
                        <div className="w-full md:w-48 h-auto md:h-full bg-gray-100 border-t md:border-t-0 md:border-r flex flex-row md:flex-col items-center md:items-stretch justify-start py-2 gap-2 overflow-x-auto md:overflow-y-auto order-last md:order-first shrink-0 px-2">
                            {TRANSFORMATION_TYPES.map((t) => (
                                <button
                                    key={t.type}
                                    title={`Add ${t.label}`}
                                    onClick={() => addTransformation(t.type as TransformationType)}
                                    className="flex items-center gap-2 p-1 rounded hover:bg-gray-200 group transition-colors"
                                >
                                    <div className={`w-8 h-8 ${t.bg} ${t.border} border rounded flex items-center justify-center text-[10px] shrink-0`}>
                                        {t.icon ? <t.icon size={12} /> : t.short}
                                    </div>
                                    <span className="text-sm text-gray-700 hidden md:block whitespace-nowrap">{t.label}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Canvas */}
                    <div className="flex-grow relative bg-gray-50">
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            nodeTypes={nodeTypes}
                            edgeTypes={edgeTypes}
                            onNodesChange={handleNodesChange}
                            onEdgesChange={handleEdgesChange}
                            onNodeClick={handleNodeClick}
                            onEdgeClick={handleEdgeClick}
                            onConnect={onConnect}
                            onInit={setRfInstance}
                            fitView
                            deleteKeyCode={readOnly ? [] : ['Backspace', 'Delete']}
                        >
                            <Background color="#aaa" gap={16} />
                            <Controls />
                            <Panel position="top-right">
                                <div className="flex gap-2">
                                    {selectedEdgeId && !readOnly && (
                                        <button
                                            onClick={deleteSelectedEdge}
                                            className="flex items-center gap-2 bg-red-500 text-white px-3 py-2 rounded shadow border border-red-600 hover:bg-red-600 text-sm font-medium cursor-pointer"
                                            title="Delete selected connection"
                                        >
                                            <Trash2 size={16} />
                                            Delete
                                        </button>
                                    )}
                                    <button
                                        onClick={onLayout}
                                        className="flex items-center gap-2 bg-white px-3 py-2 rounded shadow border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700 cursor-pointer"
                                        title="Auto-align nodes"
                                    >
                                        <LayoutGrid size={16} />
                                        Align
                                    </button>
                                </div>
                            </Panel>
                        </ReactFlow>
                    </div>

                    {/* Properties */}
                    <div className={`bg-white overflow-y-auto absolute inset-0 z-20 md:static md:w-64 md:border-l ${selectedNodeId ? 'block' : 'hidden md:block'}`}>
                        {renderConfigPanel()}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 p-4 border rounded bg-white shadow-sm">
            {!readOnly && (
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 flex items-center gap-2">
                    <Edit3 className="w-5 h-5" /> Mappings
                </h3>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mappings.map(m => (
                    <div key={m.id} className="border p-4 rounded bg-gray-50 hover:shadow-md transition-shadow relative">
                        <h4 className="font-bold text-gray-700">{m.name}</h4>
                        <p className="text-xs text-gray-500 mt-1">{m.transformations.length} transformations</p>
                        <div className="mt-4 flex gap-2">
                            <button onClick={() => handleEdit(m)} className="text-blue-600 text-xs hover:underline flex items-center gap-1">
                                <Edit3 size={12} /> {readOnly ? 'View' : 'Edit'}
                            </button>
                            {!readOnly && (
                                <button onClick={() => handleDelete(m.id)} className="text-red-600 text-xs hover:underline flex items-center gap-1">
                                    <Trash2 size={12} /> Delete
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {!readOnly && (
                    <button
                        onClick={handleCreate}
                        className="border-2 border-dashed border-gray-300 rounded p-4 flex flex-col items-center justify-center text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors h-full min-h-[100px]"
                    >
                        <Plus size={24} />
                        <span className="text-sm font-medium">Create New Mapping</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default MappingDesigner;