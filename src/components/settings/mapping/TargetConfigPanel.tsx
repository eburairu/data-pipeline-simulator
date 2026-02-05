import React from 'react';
import type { TransformationConfigProps } from './types';
import type { TargetConfig } from '../../../lib/MappingTypes';
import { useSettings } from '../../../lib/SettingsContext';

const TargetConfigPanel: React.FC<TransformationConfigProps> = ({
  config,
  onChange,
  readOnly = false,
  connections = [],
  getConnectionInfo,
}) => {
  const { topics } = useSettings();
  const targetConfig = config as unknown as TargetConfig;
  const targetType = targetConfig.targetType || 'connection';
  const connInfo = targetType === 'connection' ? getConnectionInfo?.(targetConfig.connectionId) : null;

  const handleTypeChange = (newType: 'connection' | 'topic') => {
    onChange({
      ...config,
      targetType: newType,
      connectionId: '',
      topicId: '',
      path: undefined,
      tableName: undefined
    });
  };

  return (
    <div className="space-y-3">
      {/* Target Type Selection */}
      <div>
        <label className="block text-xs text-gray-500">Target Type</label>
        <div className="flex gap-2 mt-1">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              name="targetType"
              value="connection"
              checked={targetType === 'connection'}
              onChange={() => handleTypeChange('connection')}
              disabled={readOnly}
              className="text-blue-600"
            />
            <span className="text-sm">Connection</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              name="targetType"
              value="topic"
              checked={targetType === 'topic'}
              onChange={() => handleTypeChange('topic')}
              disabled={readOnly}
              className="text-blue-600"
            />
            <span className="text-sm">Topic (Data Hub)</span>
          </label>
        </div>
      </div>

      {targetType === 'topic' ? (
        /* Topic Selection */
        <div>
          <label className="block text-xs text-gray-500">Target Topic</label>
          <select
            disabled={readOnly}
            className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
            value={targetConfig.topicId || ''}
            onChange={(e) =>
              onChange({
                ...config,
                topicId: e.target.value,
              })
            }
          >
            <option value="">Select Topic</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        /* Connection Selection (Existing Logic) */
        <>
          <div>
            <label className="block text-xs text-gray-500">Connection</label>
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
              <option value="">Select Connection</option>
              {connections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Path or Table Selection */}
          {connInfo?.type === 'file' && (
            <div>
              <label className="block text-xs text-gray-500">Path</label>
              <select
                disabled={readOnly}
                className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                value={targetConfig.path || ''}
                onChange={(e) => onChange({ ...config, path: e.target.value })}
              >
                <option value="">Select Path</option>
                {connInfo.directories?.map((dir) => (
                  <option key={dir} value={dir}>
                    {dir}
                  </option>
                ))}
              </select>
            </div>
          )}

          {connInfo?.type === 'database' && (
            <div>
              <label className="block text-xs text-gray-500">Table</label>
              <select
                disabled={readOnly}
                className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                value={targetConfig.tableName || ''}
                onChange={(e) => onChange({ ...config, tableName: e.target.value })}
              >
                <option value="">Select Table</option>
                {connInfo.tables?.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      )}

      {/* Common Options */}
      {targetType === 'connection' && (
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
              Truncate Target Table
            </span>
          </label>
        </div>
      )}
    </div>
  );
};

export default TargetConfigPanel;
