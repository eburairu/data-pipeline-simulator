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
    type TargetConfig,
    type FilterConfig,
    type ExpressionConfig,
    type AggregatorConfig,
    type ValidatorConfig,
    type JoinerConfig,
    type LookupConfig,
    type RouterConfig,
    type SorterConfig,
    type UnionConfig,
    type NormalizerConfig,
    type RankConfig,
    type SequenceConfig,
    type UpdateStrategyConfig,
    type CleansingConfig,
    type DeduplicatorConfig,
    type PivotConfig,
    type UnpivotConfig,
    type SqlConfig
} from '../../lib/MappingTypes';
import { Trash2, Plus, Save, X, Edit3, LayoutGrid, CheckSquare, Search, GitFork, ArrowUpDown, Merge, Repeat, Award, Hash, Flag, Sparkles, Copy, Table, Columns, Database } from 'lucide-react';

// --- Constants ---
const TRANSFORMATION_TYPES = [
    { type: 'source', label: 'Source', short: 'SRC', bg: 'bg-green-100', border: 'border-green-500', icon: null },
    { type: 'filter', label: 'Filter', short: 'FLT', bg: 'bg-yellow-100', border: 'border-yellow-500', icon: null },
    { type: 'expression', label: 'Expression', short: 'EXP', bg: 'bg-purple-100', border: 'border-purple-500', icon: null },
    { type: 'aggregator', label: 'Aggregator', short: 'AGG', bg: 'bg-orange-100', border: 'border-orange-500', icon: null },
    { type: 'validator', label: 'Validator', short: null, bg: 'bg-pink-100', border: 'border-pink-500', icon: CheckSquare },
    { type: 'joiner', label: 'Joiner', short: 'JOIN', bg: 'bg-blue-100', border: 'border-blue-500', icon: null },
    { type: 'lookup', label: 'Lookup', short: null, bg: 'bg-cyan-100', border: 'border-cyan-500', icon: Search },
    { type: 'router', label: 'Router', short: null, bg: 'bg-lime-100', border: 'border-lime-500', icon: GitFork },
    { type: 'sorter', label: 'Sorter', short: null, bg: 'bg-amber-100', border: 'border-amber-500', icon: ArrowUpDown },
    { type: 'union', label: 'Union', short: null, bg: 'bg-indigo-100', border: 'border-indigo-500', icon: Merge },
    { type: 'normalizer', label: 'Normalizer', short: null, bg: 'bg-violet-100', border: 'border-violet-500', icon: Repeat },
    { type: 'rank', label: 'Rank', short: null, bg: 'bg-rose-100', border: 'border-rose-500', icon: Award },
    { type: 'sequence', label: 'Sequence', short: null, bg: 'bg-sky-100', border: 'border-sky-500', icon: Hash },
    { type: 'updateStrategy', label: 'Update Strategy', short: null, bg: 'bg-slate-100', border: 'border-slate-500', icon: Flag },
    { type: 'cleansing', label: 'Cleansing', short: null, bg: 'bg-teal-100', border: 'border-teal-500', icon: Sparkles },
    { type: 'deduplicator', label: 'Deduplicator', short: null, bg: 'bg-orange-100', border: 'border-orange-500', icon: Copy },
    { type: 'pivot', label: 'Pivot', short: null, bg: 'bg-purple-100', border: 'border-purple-500', icon: Table },
    { type: 'unpivot', label: 'Unpivot', short: null, bg: 'bg-fuchsia-100', border: 'border-fuchsia-500', icon: Columns },
    { type: 'sql', label: 'SQL', short: null, bg: 'bg-slate-100', border: 'border-slate-500', icon: Database },
    { type: 'target', label: 'Target', short: 'TGT', bg: 'bg-red-100', border: 'border-red-500', icon: null },
];

// --- Custom Nodes for Designer ---
const DesignerNode = ({ data }: { data: { label: string, type: string, isSelected: boolean } }) => {
    const style = data.isSelected ? { border: '2px solid #2563eb' } : {};
    return (
        <div className={`px-4 py-2 shadow-md rounded-md bg-white border border-gray-200 text-xs w-32 flex flex-col items-center justify-center`} style={style}>
            <Handle type="target" position={Position.Left} className="w-2 h-2" />
            <div className="font-bold text-center">{data.label}</div>
            <div className="text-[10px] text-gray-500 uppercase">{data.type}</div>
            <Handle type="source" position={Position.Right} className="w-2 h-2" />
        </div>
    );
};

const nodeTypes = {
    designer: DesignerNode
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


const MappingDesigner: React.FC = () => {
    const { mappings, addMapping, updateMapping, removeMapping, connections } = useSettings();
    const [editingMapping, setEditingMapping] = useState<Mapping | null>(null);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
    const [hasAutoAligned, setHasAutoAligned] = useState(false);

    const handleCreate = () => {
        const newMapping: Mapping = {
            id: `map_${Date.now()}`,
            name: 'New Mapping',
            transformations: [],
            links: []
        };
        addMapping(newMapping);
        setEditingMapping(newMapping);
        setSelectedNodeId(null);
    };

    const handleEdit = (m: Mapping) => {
        setEditingMapping({ ...m }); // Clone to avoid direct mutation
        setSelectedNodeId(null);
    };

    const handleSave = () => {
        if (editingMapping) {
            updateMapping(editingMapping.id, editingMapping);
            setEditingMapping(null);
        }
    };

    const handleDelete = (id: string) => {
        removeMapping(id);
        if (editingMapping?.id === id) setEditingMapping(null);
    };

    // --- Node Operations ---
    const addTransformation = (type: TransformationType) => {
        if (!editingMapping) return;

        const id = `t_${Date.now()}`;
        const newTrans: Transformation = {
            id,
            type,
            name: `${type}_${editingMapping.transformations.length + 1}`,
            position: { x: 0, y: 0 },
            config: {} as any // Config initialized empty
        };

        // Initialize default config based on type
        if (type === 'source') newTrans.config = { connectionId: '' } as SourceConfig;
        if (type === 'target') newTrans.config = { connectionId: '' } as TargetConfig;
        if (type === 'filter') newTrans.config = { condition: 'true' } as FilterConfig;
        if (type === 'expression') newTrans.config = { fields: [] } as ExpressionConfig;
        if (type === 'aggregator') newTrans.config = { groupBy: [], aggregates: [] } as AggregatorConfig;
        if (type === 'validator') newTrans.config = { rules: [], errorBehavior: 'skip' } as ValidatorConfig;
        if (type === 'joiner') newTrans.config = { joinType: 'inner', masterKeys: [], detailKeys: [] } as JoinerConfig;
        if (type === 'lookup') newTrans.config = { connectionId: '', lookupKeys: [], referenceKeys: [], returnFields: [], defaultValue: '' } as LookupConfig;
        if (type === 'router') newTrans.config = { routes: [], defaultGroup: 'default' } as RouterConfig;
        if (type === 'sorter') newTrans.config = { sortFields: [] } as SorterConfig;
        if (type === 'union') newTrans.config = {} as UnionConfig;
        if (type === 'normalizer') newTrans.config = { arrayField: '', outputFields: [], keepOriginalFields: true } as NormalizerConfig;
        if (type === 'rank') newTrans.config = { partitionBy: [], orderBy: [], rankField: 'rank', rankType: 'rowNumber' } as RankConfig;
        if (type === 'sequence') newTrans.config = { sequenceField: 'seq', startValue: 1, incrementBy: 1 } as SequenceConfig;
        if (type === 'updateStrategy') newTrans.config = { strategyField: '_strategy', defaultStrategy: 'insert', conditions: [] } as UpdateStrategyConfig;
        if (type === 'cleansing') newTrans.config = { rules: [] } as CleansingConfig;
        if (type === 'deduplicator') newTrans.config = { keys: [], caseInsensitive: false } as DeduplicatorConfig;
        if (type === 'pivot') newTrans.config = { groupByFields: [], pivotField: '', valueField: '' } as PivotConfig;
        if (type === 'unpivot') newTrans.config = { fieldsToUnpivot: [], newHeaderFieldName: 'Metric', newValueFieldName: 'Value' } as UnpivotConfig;
        if (type === 'sql') newTrans.config = { sqlQuery: '', mode: 'query' } as SqlConfig;

        // Auto-link if a node is selected
        let newLinks = [...editingMapping.links];
        if (selectedNodeId) {
            newLinks.push({
                id: `l_${Date.now()}`,
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
        if (!editingMapping) return;
        setEditingMapping({
            ...editingMapping,
            transformations: editingMapping.transformations.filter(t => t.id !== id),
            links: editingMapping.links.filter(l => l.sourceId !== id && l.targetId !== id)
        });
        if (selectedNodeId === id) setSelectedNodeId(null);
    };

    const updateTransformationConfig = (id: string, config: any) => {
        if (!editingMapping) return;
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
            if (!editingMapping || !params.source || !params.target) return;

            // Prevent duplicates
            const linkExists = editingMapping.links.some(
                (l) => l.sourceId === params.source && l.targetId === params.target
            );
            if (linkExists) return;

            // Prevent self-loops if needed (though ReactFlow handles basic self-loops, logical validation is good)
            if (params.source === params.target) return;

            const newLink = {
                id: `l_${Date.now()}`,
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
        [editingMapping]
    );

    // React Flow Nodes/Edges state
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

    // Track structural changes only (not position changes)
    const transformationIds = editingMapping?.transformations.map(t => t.id).join(',') || '';
    const transformationNames = editingMapping?.transformations.map(t => t.name).join(',') || '';
    const linkIds = editingMapping?.links.map(l => l.id).join(',') || '';

    // Sync nodes/edges from editingMapping only on structural changes
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
            data: { label: t.name, type: t.type, isSelected: selectedNodeId === t.id },
            draggable: true
        }));

        const newEdges: Edge[] = editingMapping.links.map(l => ({
            id: l.id,
            source: l.sourceId,
            target: l.targetId,
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed },
            style: selectedEdgeId === l.id ? { stroke: '#ef4444', strokeWidth: 3 } : undefined
        }));

        const { nodes: layouted } = getLayoutedElements([...newNodes], [...newEdges]);

        // Preserve existing positions if nodes already exist
        setNodes(prevNodes => {
            const prevMap = new Map(prevNodes.map(n => [n.id, n]));
            return layouted.map(n => {
                const prev = prevMap.get(n.id);
                if (prev) {
                    return { ...n, position: prev.position, data: { ...n.data, isSelected: selectedNodeId === n.id } };
                }
                return n;
            });
        });
        setEdges(newEdges);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transformationIds, transformationNames, linkIds, selectedNodeId, selectedEdgeId, setNodes, setEdges]);

    // Handle node position changes (drag) - only update on drag end
    const handleNodesChange = useCallback((changes: NodeChange[]) => {
        onNodesChange(changes);

        // Only update editingMapping when drag ends
        changes.forEach(change => {
            if (change.type === 'position' && change.dragging === false && change.position) {
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
    }, [onNodesChange]);

    // Handle edge deletion via keyboard
    const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
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
    }, [onEdgesChange]);

    // Handle edge click to select (highlight for deletion)
    const handleEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
        setSelectedEdgeId(prev => prev === edge.id ? null : edge.id);
    }, []);

    // Delete selected edge with button
    const deleteSelectedEdge = useCallback(() => {
        if (!selectedEdgeId || !editingMapping) return;
        setEditingMapping(prev => {
            if (!prev) return null;
            return {
                ...prev,
                links: prev.links.filter(l => l.id !== selectedEdgeId)
            };
        });
        setSelectedEdgeId(null);
    }, [selectedEdgeId, editingMapping]);

    // Auto-align on first load
    useEffect(() => {
        if (rfInstance && nodes.length > 0 && !hasAutoAligned) {
            setHasAutoAligned(true);
            window.requestAnimationFrame(() => {
                rfInstance.fitView({ padding: 0.2, duration: 500 });
            });
        }
    }, [rfInstance, nodes, hasAutoAligned]);

    // Reset auto-align flag when editing a different mapping
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


    // --- Render Config Panel ---
    const renderConfigPanel = () => {
        if (!selectedNodeId || !editingMapping) return <div className="p-4 text-gray-400 text-sm">Select a transformation to edit properties.</div>;

        const node = editingMapping.transformations.find(t => t.id === selectedNodeId);
        if (!node) return null;

        return (
            <div className="p-4 space-y-4">
                <div className="font-bold text-sm border-b pb-2 mb-2 flex justify-between items-center">
                    {node.type.toUpperCase()} Properties
                    <div className="flex items-center gap-2">
                        <button onClick={() => removeTransformation(node.id)} className="text-red-500 hover:text-red-700">
                            <Trash2 size={16} />
                        </button>
                        <button onClick={() => setSelectedNodeId(null)} className="md:hidden text-gray-500 hover:text-gray-700">
                            <X size={16} />
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-xs text-gray-500">Name</label>
                    <input
                        className="w-full border rounded p-1 text-sm"
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

                {node.type === 'source' && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-gray-500">Connection</label>
                            <select
                                className="w-full border rounded p-1 text-sm"
                                value={(node.config as SourceConfig).connectionId}
                                onChange={e => updateTransformationConfig(node.id, { connectionId: e.target.value })}
                            >
                                <option value="">Select Connection</option>
                                {connections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500">Filename Column (optional)</label>
                            <input
                                className="w-full border rounded p-1 text-sm"
                                placeholder="e.g. source_filename"
                                value={(node.config as SourceConfig).filenameColumn || ''}
                                onChange={e => updateTransformationConfig(node.id, { filenameColumn: e.target.value })}
                            />
                            <p className="text-[10px] text-gray-400 mt-1">
                                If set, adds the source filename as a column (like IDMC CDI)
                            </p>
                        </div>
                    </div>
                )}

                {node.type === 'target' && (
                    <div>
                        <label className="block text-xs text-gray-500">Connection</label>
                        <select
                            className="w-full border rounded p-1 text-sm"
                            value={(node.config as TargetConfig).connectionId}
                            onChange={e => updateTransformationConfig(node.id, { connectionId: e.target.value })}
                        >
                            <option value="">Select Connection</option>
                            {connections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                )}

                {node.type === 'filter' && (
                    <div>
                        <label className="block text-xs text-gray-500">Filter Condition (JS Expression)</label>
                        <input
                            className="w-full border rounded p-1 text-sm"
                            placeholder="e.g. amount > 100"
                            value={(node.config as FilterConfig).condition}
                            onChange={e => updateTransformationConfig(node.id, { condition: e.target.value })}
                        />
                        <p className="text-[10px] text-gray-400 mt-1">Available vars: field names (e.g. price)</p>
                    </div>
                )}

                {/* Expression Editor */}
                {node.type === 'expression' && (
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="block text-xs text-gray-500">Output Fields</label>
                            <button
                                onClick={() => {
                                    const currentFields = (node.config as ExpressionConfig).fields || [];
                                    updateTransformationConfig(node.id, {
                                        fields: [...currentFields, { name: `field_${currentFields.length + 1}`, expression: '' }]
                                    });
                                }}
                                className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                            >
                                + Add Field
                            </button>
                        </div>

                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {((node.config as ExpressionConfig).fields || []).map((field, idx) => (
                                <div key={idx} className="border rounded p-2 bg-gray-50 space-y-1">
                                    <div className="flex gap-2 items-center">
                                        <input
                                            className="flex-1 border rounded p-1 text-xs"
                                            placeholder="Output field name"
                                            value={field.name}
                                            onChange={e => {
                                                const fields = [...(node.config as ExpressionConfig).fields];
                                                fields[idx] = { ...fields[idx], name: e.target.value };
                                                updateTransformationConfig(node.id, { fields });
                                            }}
                                        />
                                        <button
                                            onClick={() => {
                                                const fields = (node.config as ExpressionConfig).fields.filter((_, i) => i !== idx);
                                                updateTransformationConfig(node.id, { fields });
                                            }}
                                            className="text-red-500 hover:text-red-700 text-xs"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <input
                                        className="w-full border rounded p-1 text-xs font-mono"
                                        placeholder="Expression (e.g. price * quantity)"
                                        value={field.expression}
                                        onChange={e => {
                                            const fields = [...(node.config as ExpressionConfig).fields];
                                            fields[idx] = { ...fields[idx], expression: e.target.value };
                                            updateTransformationConfig(node.id, { fields });
                                        }}
                                    />
                                </div>
                            ))}
                            {((node.config as ExpressionConfig).fields || []).length === 0 && (
                                <p className="text-xs text-gray-400 italic">No fields defined. Add a field to transform data.</p>
                            )}
                        </div>
                        <p className="text-[10px] text-gray-400">
                            Expression examples: <code className="bg-gray-100 px-1 rounded">price * 1.1</code>,
                            <code className="bg-gray-100 px-1 rounded ml-1">firstName + " " + lastName</code>
                        </p>
                    </div>
                )}

                {/* Validator Editor */}
                {node.type === 'validator' && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-gray-500">Error Behavior</label>
                            <select
                                className="w-full border rounded p-1 text-sm"
                                value={(node.config as ValidatorConfig).errorBehavior}
                                onChange={e => updateTransformationConfig(node.id, { errorBehavior: e.target.value })}
                            >
                                <option value="skip">Skip Row</option>
                                <option value="error">Fail Job</option>
                            </select>
                        </div>
                        <div className="flex justify-between items-center">
                            <label className="block text-xs text-gray-500">Validation Rules</label>
                            <button
                                onClick={() => {
                                    const currentRules = (node.config as ValidatorConfig).rules || [];
                                    updateTransformationConfig(node.id, {
                                        rules: [...currentRules, { field: '', type: 'string', required: false }]
                                    });
                                }}
                                className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                            >
                                + Add Rule
                            </button>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {((node.config as ValidatorConfig).rules || []).map((rule, idx) => (
                                <div key={idx} className="border rounded p-2 bg-gray-50 space-y-2">
                                    <div className="flex gap-2 items-center">
                                        <input
                                            className="flex-1 border rounded p-1 text-xs"
                                            placeholder="Field name"
                                            value={rule.field}
                                            onChange={e => {
                                                const rules = [...(node.config as ValidatorConfig).rules];
                                                rules[idx] = { ...rules[idx], field: e.target.value };
                                                updateTransformationConfig(node.id, { rules });
                                            }}
                                        />
                                        <button
                                            onClick={() => {
                                                const rules = (node.config as ValidatorConfig).rules.filter((_, i) => i !== idx);
                                                updateTransformationConfig(node.id, { rules });
                                            }}
                                            className="text-red-500 hover:text-red-700 text-xs"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <label className="flex items-center gap-1 text-xs cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={rule.required}
                                                onChange={e => {
                                                    const rules = [...(node.config as ValidatorConfig).rules];
                                                    rules[idx] = { ...rules[idx], required: e.target.checked };
                                                    updateTransformationConfig(node.id, { rules });
                                                }}
                                            />
                                            Req
                                        </label>
                                        <select
                                            className="border rounded p-0.5 text-xs flex-grow"
                                            value={rule.type}
                                            onChange={e => {
                                                const rules = [...(node.config as ValidatorConfig).rules];
                                                rules[idx] = { ...rules[idx], type: e.target.value as any };
                                                updateTransformationConfig(node.id, { rules });
                                            }}
                                        >
                                            <option value="string">String</option>
                                            <option value="number">Number</option>
                                            <option value="boolean">Boolean</option>
                                        </select>
                                    </div>
                                    <input
                                        className="w-full border rounded p-1 text-xs font-mono"
                                        placeholder="Regex (optional)"
                                        value={rule.regex || ''}
                                        onChange={e => {
                                            const rules = [...(node.config as ValidatorConfig).rules];
                                            rules[idx] = { ...rules[idx], regex: e.target.value };
                                            updateTransformationConfig(node.id, { rules });
                                        }}
                                    />
                                </div>
                            ))}
                            {((node.config as ValidatorConfig).rules || []).length === 0 && (
                                <p className="text-xs text-gray-400 italic">No validation rules defined.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Joiner Editor */}
                {node.type === 'joiner' && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-gray-500">Join Type</label>
                            <select
                                className="w-full border rounded p-1 text-sm"
                                value={(node.config as JoinerConfig).joinType}
                                onChange={e => updateTransformationConfig(node.id, { joinType: e.target.value })}
                            >
                                <option value="inner">Inner Join</option>
                                <option value="left">Left Outer Join</option>
                                <option value="right">Right Outer Join</option>
                                <option value="full">Full Outer Join</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500">Master Keys (comma-separated)</label>
                            <input
                                className="w-full border rounded p-1 text-sm font-mono"
                                placeholder="e.g. id, customer_id"
                                value={(node.config as JoinerConfig).masterKeys?.join(', ') || ''}
                                onChange={e => updateTransformationConfig(node.id, {
                                    masterKeys: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                                })}
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Keys from the first (master) input</p>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500">Detail Keys (comma-separated)</label>
                            <input
                                className="w-full border rounded p-1 text-sm font-mono"
                                placeholder="e.g. id, cust_id"
                                value={(node.config as JoinerConfig).detailKeys?.join(', ') || ''}
                                onChange={e => updateTransformationConfig(node.id, {
                                    detailKeys: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                                })}
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Keys from the second (detail) input</p>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded p-2 text-[10px] text-blue-700">
                            <strong>Note:</strong> Joiner requires 2 source connections. The first connected source is the master, the second is the detail.
                        </div>
                    </div>
                )}

                {/* Lookup Editor */}
                {node.type === 'lookup' && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-gray-500">Lookup Connection (Database)</label>
                            <select
                                className="w-full border rounded p-1 text-sm"
                                value={(node.config as LookupConfig).connectionId}
                                onChange={e => updateTransformationConfig(node.id, { connectionId: e.target.value })}
                            >
                                <option value="">Select Connection</option>
                                {connections.filter(c => c.type === 'database').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500">Lookup Keys (comma-separated)</label>
                            <input
                                className="w-full border rounded p-1 text-sm font-mono"
                                placeholder="e.g. customer_id"
                                value={(node.config as LookupConfig).lookupKeys?.join(', ') || ''}
                                onChange={e => updateTransformationConfig(node.id, {
                                    lookupKeys: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                                })}
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Keys from input data</p>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500">Reference Keys (comma-separated)</label>
                            <input
                                className="w-full border rounded p-1 text-sm font-mono"
                                placeholder="e.g. id"
                                value={(node.config as LookupConfig).referenceKeys?.join(', ') || ''}
                                onChange={e => updateTransformationConfig(node.id, {
                                    referenceKeys: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                                })}
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Keys in lookup table</p>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500">Return Fields (comma-separated)</label>
                            <input
                                className="w-full border rounded p-1 text-sm font-mono"
                                placeholder="e.g. name, category"
                                value={(node.config as LookupConfig).returnFields?.join(', ') || ''}
                                onChange={e => updateTransformationConfig(node.id, {
                                    returnFields: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                                })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500">Default Value (if no match)</label>
                            <input
                                className="w-full border rounded p-1 text-sm"
                                placeholder="e.g. Unknown"
                                value={(node.config as LookupConfig).defaultValue || ''}
                                onChange={e => updateTransformationConfig(node.id, { defaultValue: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                {/* Router Editor */}
                {node.type === 'router' && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-gray-500">Default Group</label>
                            <input
                                className="w-full border rounded p-1 text-sm"
                                placeholder="default"
                                value={(node.config as RouterConfig).defaultGroup || 'default'}
                                onChange={e => updateTransformationConfig(node.id, { defaultGroup: e.target.value })}
                            />
                        </div>
                        <div className="flex justify-between items-center">
                            <label className="block text-xs text-gray-500">Routes</label>
                            <button
                                onClick={() => {
                                    const currentRoutes = (node.config as RouterConfig).routes || [];
                                    updateTransformationConfig(node.id, {
                                        routes: [...currentRoutes, { condition: '', groupName: `group_${currentRoutes.length + 1}` }]
                                    });
                                }}
                                className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                            >
                                + Add Route
                            </button>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {((node.config as RouterConfig).routes || []).map((route, idx) => (
                                <div key={idx} className="border rounded p-2 bg-gray-50 space-y-1">
                                    <div className="flex gap-2 items-center">
                                        <input
                                            className="flex-1 border rounded p-1 text-xs"
                                            placeholder="Group name"
                                            value={route.groupName}
                                            onChange={e => {
                                                const routes = [...(node.config as RouterConfig).routes];
                                                routes[idx] = { ...routes[idx], groupName: e.target.value };
                                                updateTransformationConfig(node.id, { routes });
                                            }}
                                        />
                                        <button
                                            onClick={() => {
                                                const routes = (node.config as RouterConfig).routes.filter((_, i) => i !== idx);
                                                updateTransformationConfig(node.id, { routes });
                                            }}
                                            className="text-red-500 hover:text-red-700 text-xs"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <input
                                        className="w-full border rounded p-1 text-xs font-mono"
                                        placeholder="Condition (e.g. amount > 1000)"
                                        value={route.condition}
                                        onChange={e => {
                                            const routes = [...(node.config as RouterConfig).routes];
                                            routes[idx] = { ...routes[idx], condition: e.target.value };
                                            updateTransformationConfig(node.id, { routes });
                                        }}
                                    />
                                </div>
                            ))}
                            {((node.config as RouterConfig).routes || []).length === 0 && (
                                <p className="text-xs text-gray-400 italic">No routes defined. All rows go to default group.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Sorter Editor */}
                {node.type === 'sorter' && (
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="block text-xs text-gray-500">Sort Fields</label>
                            <button
                                onClick={() => {
                                    const currentFields = (node.config as SorterConfig).sortFields || [];
                                    updateTransformationConfig(node.id, {
                                        sortFields: [...currentFields, { field: '', direction: 'asc' }]
                                    });
                                }}
                                className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                            >
                                + Add Field
                            </button>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {((node.config as SorterConfig).sortFields || []).map((sf, idx) => (
                                <div key={idx} className="border rounded p-2 bg-gray-50 flex gap-2 items-center">
                                    <input
                                        className="flex-1 border rounded p-1 text-xs"
                                        placeholder="Field name"
                                        value={sf.field}
                                        onChange={e => {
                                            const sortFields = [...(node.config as SorterConfig).sortFields];
                                            sortFields[idx] = { ...sortFields[idx], field: e.target.value };
                                            updateTransformationConfig(node.id, { sortFields });
                                        }}
                                    />
                                    <select
                                        className="border rounded p-1 text-xs"
                                        value={sf.direction}
                                        onChange={e => {
                                            const sortFields = [...(node.config as SorterConfig).sortFields];
                                            sortFields[idx] = { ...sortFields[idx], direction: e.target.value as 'asc' | 'desc' };
                                            updateTransformationConfig(node.id, { sortFields });
                                        }}
                                    >
                                        <option value="asc">ASC</option>
                                        <option value="desc">DESC</option>
                                    </select>
                                    <button
                                        onClick={() => {
                                            const sortFields = (node.config as SorterConfig).sortFields.filter((_, i) => i !== idx);
                                            updateTransformationConfig(node.id, { sortFields });
                                        }}
                                        className="text-red-500 hover:text-red-700 text-xs"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                            {((node.config as SorterConfig).sortFields || []).length === 0 && (
                                <p className="text-xs text-gray-400 italic">No sort fields defined.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Union Info */}
                {node.type === 'union' && (
                    <div className="space-y-3">
                        <div className="bg-indigo-50 border border-indigo-200 rounded p-2 text-[10px] text-indigo-700">
                            <strong>Union:</strong> Merges multiple input streams into one.
                            Connect 2+ sources to this node. All rows from all inputs will be combined.
                        </div>
                        <p className="text-xs text-gray-500">No additional configuration required.</p>
                    </div>
                )}

                {/* Normalizer Editor */}
                {node.type === 'normalizer' && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-gray-500">Array Field (to expand)</label>
                            <input
                                className="w-full border rounded p-1 text-sm font-mono"
                                placeholder="e.g. items"
                                value={(node.config as NormalizerConfig).arrayField || ''}
                                onChange={e => updateTransformationConfig(node.id, { arrayField: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500">Output Fields (comma-separated)</label>
                            <input
                                className="w-full border rounded p-1 text-sm font-mono"
                                placeholder="e.g. item_name, item_value"
                                value={(node.config as NormalizerConfig).outputFields?.join(', ') || ''}
                                onChange={e => updateTransformationConfig(node.id, {
                                    outputFields: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                                })}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={(node.config as NormalizerConfig).keepOriginalFields !== false}
                                onChange={e => updateTransformationConfig(node.id, { keepOriginalFields: e.target.checked })}
                            />
                            <label className="text-xs text-gray-500">Keep original fields</label>
                        </div>
                    </div>
                )}

                {/* Rank Editor */}
                {node.type === 'rank' && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-gray-500">Rank Field Name</label>
                            <input
                                className="w-full border rounded p-1 text-sm font-mono"
                                placeholder="rank"
                                value={(node.config as RankConfig).rankField || 'rank'}
                                onChange={e => updateTransformationConfig(node.id, { rankField: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500">Rank Type</label>
                            <select
                                className="w-full border rounded p-1 text-sm"
                                value={(node.config as RankConfig).rankType || 'rowNumber'}
                                onChange={e => updateTransformationConfig(node.id, { rankType: e.target.value })}
                            >
                                <option value="rowNumber">Row Number</option>
                                <option value="rank">Rank (gaps)</option>
                                <option value="denseRank">Dense Rank (no gaps)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500">Partition By (comma-separated)</label>
                            <input
                                className="w-full border rounded p-1 text-sm font-mono"
                                placeholder="e.g. department"
                                value={(node.config as RankConfig).partitionBy?.join(', ') || ''}
                                onChange={e => updateTransformationConfig(node.id, {
                                    partitionBy: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                                })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500">Order By (field:asc/desc, comma-separated)</label>
                            <input
                                className="w-full border rounded p-1 text-sm font-mono"
                                placeholder="e.g. salary:desc"
                                value={(node.config as RankConfig).orderBy?.map(o => `${o.field}:${o.direction}`).join(', ') || ''}
                                onChange={e => updateTransformationConfig(node.id, {
                                    orderBy: e.target.value.split(',').map(s => {
                                        const [field, dir] = s.trim().split(':');
                                        return { field, direction: (dir === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc' };
                                    }).filter(o => o.field)
                                })}
                            />
                        </div>
                    </div>
                )}

                {/* Sequence Editor */}
                {node.type === 'sequence' && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-gray-500">Sequence Field Name</label>
                            <input
                                className="w-full border rounded p-1 text-sm font-mono"
                                placeholder="seq"
                                value={(node.config as SequenceConfig).sequenceField || 'seq'}
                                onChange={e => updateTransformationConfig(node.id, { sequenceField: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs text-gray-500">Start Value</label>
                                <input
                                    type="number"
                                    className="w-full border rounded p-1 text-sm"
                                    value={(node.config as SequenceConfig).startValue ?? 1}
                                    onChange={e => updateTransformationConfig(node.id, { startValue: parseInt(e.target.value) || 1 })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500">Increment By</label>
                                <input
                                    type="number"
                                    className="w-full border rounded p-1 text-sm"
                                    value={(node.config as SequenceConfig).incrementBy ?? 1}
                                    onChange={e => updateTransformationConfig(node.id, { incrementBy: parseInt(e.target.value) || 1 })}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* UpdateStrategy Editor */}
                {node.type === 'updateStrategy' && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-gray-500">Strategy Field Name</label>
                            <input
                                className="w-full border rounded p-1 text-sm font-mono"
                                placeholder="_strategy"
                                value={(node.config as UpdateStrategyConfig).strategyField || '_strategy'}
                                onChange={e => updateTransformationConfig(node.id, { strategyField: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500">Default Strategy</label>
                            <select
                                className="w-full border rounded p-1 text-sm"
                                value={(node.config as UpdateStrategyConfig).defaultStrategy || 'insert'}
                                onChange={e => updateTransformationConfig(node.id, { defaultStrategy: e.target.value })}
                            >
                                <option value="insert">Insert</option>
                                <option value="update">Update</option>
                                <option value="delete">Delete</option>
                                <option value="reject">Reject</option>
                            </select>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded p-2 text-[10px] text-slate-600">
                            <strong>Tip:</strong> Rows will have the strategy field set based on conditions or default.
                        </div>
                    </div>
                )}

                {/* Cleansing Editor */}
                {node.type === 'cleansing' && (
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="block text-xs text-gray-500">Cleansing Rules</label>
                            <button
                                onClick={() => {
                                    const currentRules = (node.config as CleansingConfig).rules || [];
                                    updateTransformationConfig(node.id, {
                                        rules: [...currentRules, { field: '', operation: 'trim' }]
                                    });
                                }}
                                className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                            >
                                + Add Rule
                            </button>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {((node.config as CleansingConfig).rules || []).map((rule, idx) => (
                                <div key={idx} className="border rounded p-2 bg-gray-50 space-y-1">
                                    <div className="flex gap-2 items-center">
                                        <input
                                            className="flex-1 border rounded p-1 text-xs"
                                            placeholder="Field name"
                                            value={rule.field}
                                            onChange={e => {
                                                const rules = [...(node.config as CleansingConfig).rules];
                                                rules[idx] = { ...rules[idx], field: e.target.value };
                                                updateTransformationConfig(node.id, { rules });
                                            }}
                                        />
                                        <select
                                            className="border rounded p-1 text-xs"
                                            value={rule.operation}
                                            onChange={e => {
                                                const rules = [...(node.config as CleansingConfig).rules];
                                                rules[idx] = { ...rules[idx], operation: e.target.value as any };
                                                updateTransformationConfig(node.id, { rules });
                                            }}
                                        >
                                            <option value="trim">Trim</option>
                                            <option value="upper">Uppercase</option>
                                            <option value="lower">Lowercase</option>
                                            <option value="nullToDefault">Null to Default</option>
                                            <option value="replace">Replace</option>
                                        </select>
                                        <button
                                            onClick={() => {
                                                const rules = (node.config as CleansingConfig).rules.filter((_, i) => i !== idx);
                                                updateTransformationConfig(node.id, { rules });
                                            }}
                                            className="text-red-500 hover:text-red-700 text-xs"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    {(rule.operation === 'nullToDefault' || rule.operation === 'replace') && (
                                        <input
                                            className="w-full border rounded p-1 text-xs"
                                            placeholder="Default/Replace value"
                                            value={rule.defaultValue || rule.replaceWith || ''}
                                            onChange={e => {
                                                const rules = [...(node.config as CleansingConfig).rules];
                                                if (rule.operation === 'nullToDefault') {
                                                    rules[idx] = { ...rules[idx], defaultValue: e.target.value };
                                                } else {
                                                    rules[idx] = { ...rules[idx], replaceWith: e.target.value };
                                                }
                                                updateTransformationConfig(node.id, { rules });
                                            }}
                                        />
                                    )}
                                    {rule.operation === 'replace' && (
                                        <input
                                            className="w-full border rounded p-1 text-xs"
                                            placeholder="Pattern (regex)"
                                            value={rule.replacePattern || ''}
                                            onChange={e => {
                                                const rules = [...(node.config as CleansingConfig).rules];
                                                rules[idx] = { ...rules[idx], replacePattern: e.target.value };
                                                updateTransformationConfig(node.id, { rules });
                                            }}
                                        />
                                    )}
                                </div>
                            ))}
                            {((node.config as CleansingConfig).rules || []).length === 0 && (
                                <p className="text-xs text-gray-400 italic">No rules defined.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Deduplicator Editor */}
                {node.type === 'deduplicator' && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-gray-500">Unique Keys (comma-separated)</label>
                            <input
                                className="w-full border rounded p-1 text-sm font-mono"
                                placeholder="e.g. email, date"
                                value={(node.config as DeduplicatorConfig).keys?.join(', ') || ''}
                                onChange={e => updateTransformationConfig(node.id, {
                                    keys: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                                })}
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Leave empty to use all fields</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={(node.config as DeduplicatorConfig).caseInsensitive || false}
                                onChange={e => updateTransformationConfig(node.id, { caseInsensitive: e.target.checked })}
                            />
                            <label className="text-xs text-gray-500">Case Insensitive</label>
                        </div>
                    </div>
                )}

                {/* Pivot Editor */}
                {node.type === 'pivot' && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-gray-500">Group By Fields</label>
                            <input
                                className="w-full border rounded p-1 text-sm font-mono"
                                placeholder="e.g. region, year"
                                value={(node.config as PivotConfig).groupByFields?.join(', ') || ''}
                                onChange={e => updateTransformationConfig(node.id, {
                                    groupByFields: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                                })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500">Pivot Field (Column Header Source)</label>
                            <input
                                className="w-full border rounded p-1 text-sm font-mono"
                                placeholder="e.g. month"
                                value={(node.config as PivotConfig).pivotField || ''}
                                onChange={e => updateTransformationConfig(node.id, { pivotField: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500">Value Field</label>
                            <input
                                className="w-full border rounded p-1 text-sm font-mono"
                                placeholder="e.g. sales"
                                value={(node.config as PivotConfig).valueField || ''}
                                onChange={e => updateTransformationConfig(node.id, { valueField: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                {/* Unpivot Editor */}
                {node.type === 'unpivot' && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-gray-500">Fields to Unpivot</label>
                            <input
                                className="w-full border rounded p-1 text-sm font-mono"
                                placeholder="e.g. jan_sales, feb_sales, mar_sales"
                                value={(node.config as UnpivotConfig).fieldsToUnpivot?.join(', ') || ''}
                                onChange={e => updateTransformationConfig(node.id, {
                                    fieldsToUnpivot: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                                })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500">New Header Column Name</label>
                            <input
                                className="w-full border rounded p-1 text-sm font-mono"
                                placeholder="e.g. month"
                                value={(node.config as UnpivotConfig).newHeaderFieldName || 'Metric'}
                                onChange={e => updateTransformationConfig(node.id, { newHeaderFieldName: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500">New Value Column Name</label>
                            <input
                                className="w-full border rounded p-1 text-sm font-mono"
                                placeholder="e.g. sales_amount"
                                value={(node.config as UnpivotConfig).newValueFieldName || 'Value'}
                                onChange={e => updateTransformationConfig(node.id, { newValueFieldName: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                {/* SQL Editor */}
                {node.type === 'sql' && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-gray-500">SQL Query (Simulation Only)</label>
                            <textarea
                                className="w-full border rounded p-1 text-sm font-mono h-24"
                                placeholder="SELECT * FROM table WHERE ..."
                                value={(node.config as SqlConfig).sqlQuery || ''}
                                onChange={e => updateTransformationConfig(node.id, { sqlQuery: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500">Mode</label>
                            <select
                                className="w-full border rounded p-1 text-sm"
                                value={(node.config as SqlConfig).mode || 'query'}
                                onChange={e => updateTransformationConfig(node.id, { mode: e.target.value as any })}
                            >
                                <option value="query">Query</option>
                                <option value="procedure">Procedure</option>
                                <option value="script">Script</option>
                            </select>
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
                        className="font-bold bg-transparent border-none focus:ring-0 text-sm min-w-0 flex-grow"
                        value={editingMapping.name}
                        onChange={e => setEditingMapping({ ...editingMapping, name: e.target.value })}
                    />
                    <div className="flex gap-2 shrink-0">
                        <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">
                            <Save size={14} /> <span className="hidden sm:inline">Save</span>
                        </button>
                        <button onClick={() => setEditingMapping(null)} className="flex items-center gap-1 px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300">
                            <X size={14} /> <span className="hidden sm:inline">Cancel</span>
                        </button>
                    </div>
                </div>

                <div className="flex-grow flex flex-col md:flex-row overflow-hidden relative">
                    {/* Toolbar */}
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

                    {/* Canvas */}
                    <div className="flex-grow relative bg-gray-50">
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            nodeTypes={nodeTypes}
                            onNodesChange={handleNodesChange}
                            onEdgesChange={handleEdgesChange}
                            onNodeClick={handleNodeClick}
                            onEdgeClick={handleEdgeClick}
                            onConnect={onConnect}
                            onInit={setRfInstance}
                            fitView
                            deleteKeyCode={['Backspace', 'Delete']}
                        >
                            <Background color="#aaa" gap={16} />
                            <Controls />
                            <Panel position="top-right">
                                <div className="flex gap-2">
                                    {selectedEdgeId && (
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
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 flex items-center gap-2">
                <Edit3 className="w-5 h-5" /> Mappings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mappings.map(m => (
                    <div key={m.id} className="border p-4 rounded bg-gray-50 hover:shadow-md transition-shadow relative">
                        <h4 className="font-bold text-gray-700">{m.name}</h4>
                        <p className="text-xs text-gray-500 mt-1">{m.transformations.length} transformations</p>
                        <div className="mt-4 flex gap-2">
                            <button onClick={() => handleEdit(m)} className="text-blue-600 text-xs hover:underline flex items-center gap-1">
                                <Edit3 size={12} /> Edit
                            </button>
                            <button onClick={() => handleDelete(m.id)} className="text-red-600 text-xs hover:underline flex items-center gap-1">
                                <Trash2 size={12} /> Delete
                            </button>
                        </div>
                    </div>
                ))}

                <button
                    onClick={handleCreate}
                    className="border-2 border-dashed border-gray-300 rounded p-4 flex flex-col items-center justify-center text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors h-full min-h-[100px]"
                >
                    <Plus size={24} />
                    <span className="text-sm font-medium">Create New Mapping</span>
                </button>
            </div>
        </div>
    );
};

export default MappingDesigner;
