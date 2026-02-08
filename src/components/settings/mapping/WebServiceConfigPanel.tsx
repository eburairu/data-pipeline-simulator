/**
 * WebService変換の設定パネル
 * Web APIを呼び出してデータを取得・送信する設定を行う
 */
import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { TransformationConfigProps } from './types';
import type { WebServiceConfig } from '../../../lib/MappingTypes';

/** HTTPメソッドの選択肢 */
const HTTP_METHODS: WebServiceConfig['method'][] = ['GET', 'POST', 'PUT', 'DELETE'];

const WebServiceConfigPanel: React.FC<TransformationConfigProps> = ({
  config,
  onChange,
  readOnly = false,
}) => {
  const webServiceConfig = config as unknown as WebServiceConfig;
  const url = webServiceConfig.url || '';
  const method = webServiceConfig.method || 'GET';
  const headers = webServiceConfig.headers || [];
  const requestBody = webServiceConfig.requestBody || '';
  const mockResponse = webServiceConfig.mockResponse || '';
  const responseMap = webServiceConfig.responseMap || [];

  /** ヘッダーを追加 */
  const handleAddHeader = () => {
    onChange({ ...config, headers: [...headers, { key: '', value: '' }] });
  };

  /** ヘッダーを削除 */
  const handleRemoveHeader = (index: number) => {
    const newHeaders = headers.filter((_, i) => i !== index);
    onChange({ ...config, headers: newHeaders });
  };

  /** ヘッダーを更新 */
  const handleHeaderChange = (
    index: number,
    field: 'key' | 'value',
    value: string
  ) => {
    const newHeaders = [...headers];
    newHeaders[index] = { ...newHeaders[index], [field]: value };
    onChange({ ...config, headers: newHeaders });
  };

  /** レスポンスマッピングを追加 */
  const handleAddResponseMap = () => {
    onChange({
      ...config,
      responseMap: [...responseMap, { path: '', field: '' }],
    });
  };

  /** レスポンスマッピングを削除 */
  const handleRemoveResponseMap = (index: number) => {
    const newResponseMap = responseMap.filter((_, i) => i !== index);
    onChange({ ...config, responseMap: newResponseMap });
  };

  /** レスポンスマッピングを更新 */
  const handleResponseMapChange = (
    index: number,
    field: 'path' | 'field',
    value: string
  ) => {
    const newResponseMap = [...responseMap];
    newResponseMap[index] = { ...newResponseMap[index], [field]: value };
    onChange({ ...config, responseMap: newResponseMap });
  };

  return (
    <div className="space-y-4">
      {/* URL */}
      <div>
        <label className="block text-xs text-gray-500 font-medium mb-1">
          エンドポイントURL
        </label>
        <input
          disabled={readOnly}
          className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
          placeholder="https://api.example.com/data"
          value={url}
          onChange={(e) => onChange({ ...config, url: e.target.value })}
        />
        <p className="text-xs text-gray-400 mt-1">
          {'{'}fieldName{'}'} でフィールド値を埋め込み可能
        </p>
      </div>

      {/* HTTPメソッド */}
      <div>
        <label className="block text-xs text-gray-500 font-medium mb-1">
          HTTPメソッド
        </label>
        <select
          disabled={readOnly}
          className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
          value={method}
          onChange={(e) =>
            onChange({ ...config, method: e.target.value as WebServiceConfig['method'] })
          }
        >
          {HTTP_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {/* ヘッダー */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs text-gray-500 font-medium">
            HTTPヘッダー
          </label>
          {!readOnly && (
            <button
              type="button"
              onClick={handleAddHeader}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Plus size={12} />
              追加
            </button>
          )}
        </div>
        {headers.length === 0 ? (
          <p className="text-xs text-gray-400">ヘッダーなし</p>
        ) : (
          <div className="space-y-2">
            {headers.map((header, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  disabled={readOnly}
                  className="flex-1 border rounded p-1 text-sm disabled:bg-gray-100"
                  placeholder="ヘッダー名"
                  value={header.key}
                  onChange={(e) => handleHeaderChange(index, 'key', e.target.value)}
                />
                <span className="text-gray-400">:</span>
                <input
                  disabled={readOnly}
                  className="flex-1 border rounded p-1 text-sm disabled:bg-gray-100"
                  placeholder="値"
                  value={header.value}
                  onChange={(e) => handleHeaderChange(index, 'value', e.target.value)}
                />
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemoveHeader(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* リクエストボディ (POST/PUT時) */}
      {(method === 'POST' || method === 'PUT') && (
        <div>
          <label className="block text-xs text-gray-500 font-medium mb-1">
            リクエストボディ
          </label>
          <textarea
            disabled={readOnly}
            className="w-full border rounded p-2 text-sm font-mono disabled:bg-gray-100"
            rows={4}
            placeholder='{"key": "{fieldName}", "data": {...}}'
            value={requestBody}
            onChange={(e) => onChange({ ...config, requestBody: e.target.value })}
          />
        </div>
      )}

      {/* モックレスポンス */}
      <div>
        <label className="block text-xs text-gray-500 font-medium mb-1">
          モックレスポンス (JSON)
        </label>
        <textarea
          disabled={readOnly}
          className="w-full border rounded p-2 text-sm font-mono disabled:bg-gray-100"
          rows={4}
          placeholder='[{"id": 1, "name": "Test"}]'
          value={mockResponse}
          onChange={(e) => onChange({ ...config, mockResponse: e.target.value })}
        />
        <p className="text-xs text-gray-400 mt-1">
          実際のAPIを呼び出さずにこの値を返します。{'${param}'} でパラメータ置換可能。
        </p>
      </div>

      {/* レスポンスマッピング */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs text-gray-500 font-medium">
            レスポンスマッピング
          </label>
          {!readOnly && (
            <button
              type="button"
              onClick={handleAddResponseMap}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Plus size={12} />
              追加
            </button>
          )}
        </div>
        {responseMap.length === 0 ? (
          <p className="text-xs text-gray-400">
            レスポンス全体がそのまま使用されます
          </p>
        ) : (
          <div className="space-y-2">
            {responseMap.map((mapping, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  disabled={readOnly}
                  className="flex-1 border rounded p-1 text-sm disabled:bg-gray-100"
                  placeholder="JSONパス（例: data.items[0].name）"
                  value={mapping.path}
                  onChange={(e) =>
                    handleResponseMapChange(index, 'path', e.target.value)
                  }
                />
                <span className="text-gray-400">→</span>
                <input
                  disabled={readOnly}
                  className="flex-1 border rounded p-1 text-sm disabled:bg-gray-100"
                  placeholder="出力フィールド名"
                  value={mapping.field}
                  onChange={(e) =>
                    handleResponseMapChange(index, 'field', e.target.value)
                  }
                />
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemoveResponseMap(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WebServiceConfigPanel;
