/**
 * Source変換の設定パネル
 * データソース（ファイルまたはデータベース）の接続設定を行う
 */
import React from 'react';
import type { TransformationConfigProps } from './types';
import type { SourceConfig } from '../../../lib/MappingTypes';

const SourceConfigPanel: React.FC<TransformationConfigProps> = ({
  config,
  onChange,
  readOnly = false,
  connections = [],
  getConnectionInfo,
}) => {
  const sourceConfig = config as unknown as SourceConfig;
  const connInfo = getConnectionInfo?.(sourceConfig.connectionId);

  return (
    <div className="space-y-3">
      {/* 接続選択 */}
      <div>
        <label className="block text-xs text-gray-500">接続先</label>
        <select
          disabled={readOnly}
          className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
          value={sourceConfig.connectionId || ''}
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
        <div>
          <label className="block text-xs text-gray-500">パス</label>
          <select
            disabled={readOnly}
            className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
            value={sourceConfig.path || ''}
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
      )}

      {connInfo?.type === 'database' && (
        <div>
          <label className="block text-xs text-gray-500">テーブル</label>
          <select
            disabled={readOnly}
            className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
            value={sourceConfig.tableName || ''}
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

      {/* 読み取り後にソースファイルを削除するか */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            disabled={readOnly}
            checked={sourceConfig.deleteAfterRead !== false}
            onChange={(e) =>
              onChange({ ...config, deleteAfterRead: e.target.checked })
            }
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
          />
          <span className="text-xs text-gray-700">
            読み取り後にソースファイルを削除
            <span className="text-gray-400 ml-1">（チェックを外すと保持）</span>
          </span>
        </label>
      </div>
    </div>
  );
};

export default SourceConfigPanel;
