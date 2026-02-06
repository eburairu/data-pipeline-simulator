/**
 * Target変換の設定パネル
 * データの出力先（ファイルまたはデータベース）の接続設定を行う
 */
import React from 'react';
import type { TransformationConfigProps } from './types';
import type { TargetConfig } from '../../../lib/MappingTypes';
import { type CompressionFormat } from '../../../lib/types';
import { Archive, Plus } from 'lucide-react';

const CompressionActionsEditor: React.FC<{ actions: CompressionFormat[], onChange: (actions: CompressionFormat[]) => void }> = ({ actions, onChange }) => {
    const addAction = (format: CompressionFormat) => onChange([...actions, format]);
    const removeAction = (index: number) => onChange(actions.filter((_, i) => i !== index));

    return (
        <div className="flex flex-col gap-1">
            <div className="flex flex-wrap gap-2 items-center min-h-[24px]">
                {actions.length === 0 && <span className="text-gray-400 text-xs italic">No compression</span>}
                {actions.map((action, i) => (
                    <div key={i} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs flex items-center gap-1 border border-blue-200">
                        {action}
                        <button onClick={() => removeAction(i)} className="text-blue-500 hover:text-red-500 font-bold px-1">×</button>
                    </div>
                ))}
            </div>
            <div className="flex gap-2 mt-1">
                {(['gz', 'tar', 'zip'] as CompressionFormat[]).map(fmt => (
                    <button 
                        key={fmt} 
                        onClick={() => addAction(fmt)} 
                        className="px-2 py-0.5 text-xs border rounded hover:bg-gray-50 text-gray-600 flex items-center gap-1"
                    >
                        <Plus size={10} /> {fmt}
                    </button>
                ))}
            </div>
        </div>
    );
};

const TargetConfigPanel: React.FC<TransformationConfigProps> = ({
  config,
  onChange,
  readOnly = false,
  connections = [],
  getConnectionInfo,
}) => {
  const targetConfig = config as unknown as TargetConfig;
  const connInfo = targetConfig.connectionId ? getConnectionInfo?.(targetConfig.connectionId) : undefined;

  return (
    <div className="space-y-3">
      {/* 接続選択 */}
      <div>
        <label className="block text-xs text-gray-500">接続先</label>
        <select
          disabled={readOnly}
          className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
          value={targetConfig.connectionId || ''}
          onChange={(e) =>
            onChange({
              ...config,
              connectionId: e.target.value,
              path: undefined,
              tableName: undefined,
            })
          }
        >
          <option value="">接続を選択</option>
          {connections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* ファイルまたはテーブルの選択 */}
      {connInfo?.type === 'file' && (
        <div className="space-y-3">
            <div>
            <label className="block text-xs text-gray-500">パス</label>
            <select
                disabled={readOnly}
                className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                value={targetConfig.path || ''}
                onChange={(e) => onChange({ ...config, path: e.target.value })}
            >
                <option value="">パスを選択</option>
                {connInfo.directories?.map((dir) => (
                <option key={dir} value={dir}>
                    {dir}
                </option>
                ))}
            </select>
            </div>

            <div className="pt-2 border-t border-gray-100">
                <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                    <Archive size={14} /> Compression Actions
                </label>
                <CompressionActionsEditor 
                    actions={targetConfig.compressionActions || []}
                    onChange={(actions) => onChange({ ...config, compressionActions: actions })}
                />
            </div>
        </div>
      )}

      {connInfo?.type === 'database' && (
        <div>
          <label className="block text-xs text-gray-500">テーブル</label>
          <select
            disabled={readOnly}
            className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
            value={targetConfig.tableName || ''}
            onChange={(e) => onChange({ ...config, tableName: e.target.value })}
          >
            <option value="">テーブルを選択</option>
            {connInfo.tables?.map((t) => (
              <option key={t.id} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ターゲットテーブルをTRUNCATEするか */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            disabled={readOnly}
            checked={targetConfig.truncate || false}
            onChange={(e) => onChange({ ...config, truncate: e.target.checked })}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
          />
          <span className="text-xs text-gray-700">
            ターゲットテーブルをTRUNCATE
          </span>
        </label>
      </div>
    </div>
  );
};

export default TargetConfigPanel;
