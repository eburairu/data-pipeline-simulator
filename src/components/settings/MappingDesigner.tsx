import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, { Background, Controls, Panel, type Node, type Edge, type Connection, MarkerType, type ReactFlowInstance, useNodesState, useEdgesState, type NodeChange, type EdgeChange } from 'reactflow';
import 'reactflow/dist/style.css';
import { useSettings } from '../../lib/SettingsContext';
import {
    type Mapping,
    type TransformationType,
} from '../../lib/MappingTypes';
import { type ExecutionStats } from '../../lib/MappingEngine';
import { Trash2, Plus, Save, X, Edit3, LayoutGrid } from 'lucide-react';
import { getConfigPanel, registerDefaultConfigPanels } from './mapping';
import { TRANSFORMATION_TYPES, createDefaultTransformation } from './mapping/constants';
import { nodeTypes, edgeTypes } from './mapping/DesignerNode';
import { getLayoutedElements, applyDagreLayout } from './mapping/layoutHelper';

interface MappingDesignerProps {
    executionStats?: ExecutionStats;
    readOnly?: boolean;
    initialMappingId?: string;
}

const MappingDesigner: React.FC<MappingDesignerProps> = ({ executionStats, readOnly = false, initialMappingId }) => {
    const { mappings, addMapping, updateMapping, removeMapping, connections, hosts, tables } = useSettings();

    // 接続IDから接続情報を取得し、タイプに応じたパス/テーブル選択肢を返す
    const getConnectionInfo = useCallback((connectionId: string) => {
        const connection = connections.find(c => c.id === connectionId);
        if (!connection) return null;

        if (connection.type === 'file') {
            const host = hosts.find(h => h.name === connection.host);
            return { type: 'file' as const, directories: host?.directories || [] };
        } else {
            return { type: 'database' as const, tables: tables };
        }
    }, [connections, hosts, tables]);
    const [editingMapping, setEditingMapping] = useState<Mapping | null>(null);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
    const [hasAutoAligned, setHasAutoAligned] = useState(false);

    // ConfigPanelの登録（コンポーネントマウント時に1回のみ）
    useEffect(() => {
        registerDefaultConfigPanels();
    }, []);

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
        const newTrans = createDefaultTransformation(type, id, editingMapping.transformations.length + 1);
        if (!newTrans) return;

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

        const layoutedNodes = applyDagreLayout(nodes, edges);
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
                            <button onClick={() => removeTransformation(node.id)} className="text-red-500 hover:text-red-700" aria-label="変換を削除">
                                <Trash2 size={16} aria-hidden="true" />
                            </button>
                        )}
                        <button onClick={() => setSelectedNodeId(null)} className="md:hidden text-gray-500 hover:text-gray-700" aria-label="パネルを閉じる">
                            <X size={16} aria-hidden="true" />
                        </button>
                    </div>
                </div>

                <div>
                    <label htmlFor={`trans-name-${node.id}`} className="block text-xs text-gray-500">Name</label>
                    <input
                        id={`trans-name-${node.id}`}
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

                {/* 動的ConfigPanelの表示 */}
                {(() => {
                    const ConfigPanel = getConfigPanel(node.type);
                    if (ConfigPanel) {
                        return (
                            <ConfigPanel
                                transformationId={node.id}
                                type={node.type}
                                config={node.config as Record<string, unknown>}
                                onChange={(newConfig) => updateTransformationConfig(node.id, newConfig)}
                                mapping={editingMapping}
                                readOnly={readOnly}
                                connections={connections}
                                hosts={hosts}
                                tables={tables}
                                getConnectionInfo={getConnectionInfo}
                            />
                        );
                    }
                    return (
                        <div className="text-sm text-gray-500">
                            この変換タイプの設定パネルは登録されていません。
                        </div>
                    );
                })()}
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
                        aria-label="マッピング名"
                    />
                    <div className="flex gap-2 shrink-0">
                        {!readOnly && (
                            <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700" aria-label="マッピングを保存">
                                <Save size={14} aria-hidden="true" /> <span className="hidden sm:inline">Save</span>
                            </button>
                        )}
                        <button onClick={() => setEditingMapping(null)} className="flex items-center gap-1 px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300" aria-label={readOnly ? 'マッピングを閉じる' : 'キャンセル'}>
                            <X size={14} aria-hidden="true" /> <span className="hidden sm:inline">{readOnly ? 'Close' : 'Cancel'}</span>
                        </button>
                    </div>
                </div>

                <div className="flex-grow flex flex-col md:flex-row overflow-hidden relative">
                    {/* ツールバー */}
                    {!readOnly && (
                        <div className="w-full md:w-48 h-auto md:h-full bg-gray-100 border-t md:border-t-0 md:border-r flex flex-row md:flex-col items-center md:items-stretch justify-start py-2 gap-2 overflow-x-auto md:overflow-y-auto order-last md:order-first shrink-0 px-2">
                            {TRANSFORMATION_TYPES.map((t) => (
                                <button
                                    key={t.type}
                                    title={`Add ${t.label}`}
                                    aria-label={`${t.label} を追加`}
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

                    {/* キャンバス */}
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

                    {/* プロパティパネル */}
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
