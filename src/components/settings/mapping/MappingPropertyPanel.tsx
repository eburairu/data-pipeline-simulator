import React from 'react';
import { Trash2, X } from 'lucide-react';
import { getConfigPanel } from './index';
import type { Mapping, TransformationType } from '../../../lib/MappingTypes';
import type { ConnectionDefinition, Host, TableDefinition } from '../../../lib/types';
import type { ConnectionInfo } from './types';

interface MappingPropertyPanelProps {
  selectedNodeId: string | null;
  editingMapping: Mapping | null;
  readOnly: boolean;
  removeTransformation: (id: string) => void;
  setSelectedNodeId: (id: string | null) => void;
  updateTransformationConfig: (id: string, config: any) => void;
  setEditingMapping: React.Dispatch<React.SetStateAction<Mapping | null>>;
  connections: ConnectionDefinition[];
  hosts: Host[];
  tables: TableDefinition[];
  getConnectionInfo: (connectionId: string) => ConnectionInfo | null;
}

const MappingPropertyPanel: React.FC<MappingPropertyPanelProps> = ({
  selectedNodeId,
  editingMapping,
  readOnly,
  removeTransformation,
  setSelectedNodeId,
  updateTransformationConfig,
  setEditingMapping,
  connections,
  hosts,
  tables,
  getConnectionInfo,
}) => {
  if (!selectedNodeId || !editingMapping) {
    return <div className="p-4 text-gray-400 text-sm">Select a transformation to edit properties.</div>;
  }

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
        const ConfigPanel = getConfigPanel(node.type as TransformationType);
        if (ConfigPanel) {
          return (
            <ConfigPanel
              transformationId={node.id}
              type={node.type as TransformationType}
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

export default MappingPropertyPanel;
