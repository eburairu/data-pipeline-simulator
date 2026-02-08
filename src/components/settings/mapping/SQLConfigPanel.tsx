/**
 * SQL変換の設定パネル
 * SQLクエリによるデータ変換を設定する
 */
import React from 'react';
import type { TransformationConfigProps } from './types';
import type { SqlConfig } from '../../../lib/MappingTypes';

/** SQLモードの選択肢 */
const SQL_MODES: { value: SqlConfig['mode']; label: string; description: string }[] = [
  { value: 'query', label: 'クエリ', description: 'SELECT文を実行' },
  { value: 'procedure', label: 'プロシージャ', description: 'ストアドプロシージャを呼び出し' },
  { value: 'script', label: 'スクリプト', description: '複数のSQL文を実行' },
];

const SQLConfigPanel: React.FC<TransformationConfigProps> = ({
  config,
  onChange,
  readOnly = false,
  connections = [],
}) => {
  const sqlConfig = config as unknown as SqlConfig;
  const sqlQuery = sqlConfig.sqlQuery || '';
  const dbConnectionId = sqlConfig.dbConnectionId || '';
  const mode = sqlConfig.mode || 'query';
  const mockResult = sqlConfig.mockResult || '';

  // データベース接続のみをフィルタリング
  const dbConnections = connections.filter((c) => c.type === 'database');

  return (
    <div className="space-y-4">
      {/* データベース接続 */}
      <div>
        <label className="block text-xs text-gray-500 font-medium mb-1">
          データベース接続
        </label>
        <select
          disabled={readOnly}
          className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
          value={dbConnectionId}
          onChange={(e) => onChange({ ...config, dbConnectionId: e.target.value })}
        >
          <option value="">-- 接続を選択（オプション） --</option>
          {dbConnections.map((conn) => (
            <option key={conn.id} value={conn.id}>
              {conn.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-1">
          指定しない場合、入力データに対してクエリを実行します
        </p>
      </div>

      {/* SQLモード */}
      <div>
        <label className="block text-xs text-gray-500 font-medium mb-1">
          実行モード
        </label>
        <select
          disabled={readOnly}
          className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
          value={mode}
          onChange={(e) => onChange({ ...config, mode: e.target.value })}
        >
          {SQL_MODES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-1">
          {SQL_MODES.find((m) => m.value === mode)?.description}
        </p>
      </div>

      {/* SQLクエリ */}
      <div>
        <label className="block text-xs text-gray-500 font-medium mb-1">
          SQL
        </label>
        <textarea
          disabled={readOnly}
          className="w-full border rounded p-2 text-sm font-mono disabled:bg-gray-100"
          rows={8}
          placeholder={
            mode === 'query'
              ? 'SELECT * FROM input WHERE amount > 100'
              : mode === 'procedure'
              ? 'CALL process_data(:param1, :param2)'
              : '-- 複数のSQL文をセミコロンで区切って記述\nINSERT INTO ...\nUPDATE ...'
          }
          value={sqlQuery}
          onChange={(e) => onChange({ ...config, sqlQuery: e.target.value })}
        />
      </div>

      {/* モック結果 */}
      <div>
        <label className="block text-xs text-gray-500 font-medium mb-1">
          モック結果 (JSON Array)
        </label>
        <textarea
          disabled={readOnly}
          className="w-full border rounded p-2 text-sm font-mono disabled:bg-gray-100"
          rows={4}
          placeholder='[{"id": 1, "value": "Result"}]'
          value={mockResult}
          onChange={(e) => onChange({ ...config, mockResult: e.target.value })}
        />
        <p className="text-xs text-gray-400 mt-1">
          DBを実行せずにこの結果を返します。空の場合はパススルーされます。
        </p>
      </div>

      {/* ヒント */}
      <div className="border rounded p-2 bg-gray-50 text-xs text-gray-500 space-y-1">
        <p className="font-medium">使用可能な変数:</p>
        <p>• <code className="bg-gray-200 px-1 rounded">input</code> - 入力データテーブル</p>
        <p>• <code className="bg-gray-200 px-1 rounded">:fieldName</code> - レコードのフィールド値をバインド</p>
        <p>• <code className="bg-gray-200 px-1 rounded">$$paramName$$</code> - マッピングパラメータ</p>
      </div>
    </div>
  );
};

export default SQLConfigPanel;
