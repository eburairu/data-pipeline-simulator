/**
 * Router変換の設定パネル
 * 条件に基づいてデータを異なるルートに振り分ける設定を行う
 */
import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { TransformationConfigProps } from './types';
import type { RouterConfig, RouterRoute } from '../../../lib/MappingTypes';

const RouterConfigPanel: React.FC<TransformationConfigProps> = ({
  config,
  onChange,
  readOnly = false,
}) => {
  const routerConfig = config as unknown as RouterConfig;
  const routes = routerConfig.routes || [];
  const defaultGroup = routerConfig.defaultGroup || 'default';

  /** ルートを追加 */
  const handleAddRoute = () => {
    const newRoute: RouterRoute = {
      condition: '',
      groupName: `group${routes.length + 1}`,
    };
    onChange({ ...config, routes: [...routes, newRoute] });
  };

  /** ルートを削除 */
  const handleRemoveRoute = (index: number) => {
    const newRoutes = routes.filter((_, i) => i !== index);
    onChange({ ...config, routes: newRoutes });
  };

  /** ルートを更新 */
  const handleRouteChange = (
    index: number,
    field: keyof RouterRoute,
    value: string
  ) => {
    const newRoutes = [...routes];
    newRoutes[index] = { ...newRoutes[index], [field]: value };
    onChange({ ...config, routes: newRoutes });
  };

  return (
    <div className="space-y-4">
      {/* ルート定義 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs text-gray-500 font-medium">
            ルート条件
          </label>
          {!readOnly && (
            <button
              type="button"
              onClick={handleAddRoute}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Plus size={12} />
              追加
            </button>
          )}
        </div>
        {routes.length === 0 ? (
          <p className="text-xs text-gray-400">
            ルート条件を追加してください
          </p>
        ) : (
          <div className="space-y-3">
            {routes.map((route, index) => (
              <div
                key={index}
                className="border rounded p-2 bg-gray-50 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    ルート #{index + 1}
                  </span>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRoute(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-400">グループ名</label>
                  <input
                    disabled={readOnly}
                    className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                    placeholder="例: group_a"
                    value={route.groupName}
                    onChange={(e) =>
                      handleRouteChange(index, 'groupName', e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400">
                    条件 (JavaScript式)
                  </label>
                  <input
                    disabled={readOnly}
                    className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
                    placeholder="例: status === 'active'"
                    value={route.condition}
                    onChange={(e) =>
                      handleRouteChange(index, 'condition', e.target.value)
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* デフォルトグループ */}
      <div>
        <label className="block text-xs text-gray-500 font-medium mb-1">
          デフォルトグループ
        </label>
        <input
          disabled={readOnly}
          className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
          placeholder="default"
          value={defaultGroup}
          onChange={(e) => onChange({ ...config, defaultGroup: e.target.value })}
        />
        <p className="text-xs text-gray-400 mt-1">
          どの条件にもマッチしなかったレコードが振り分けられるグループ
        </p>
      </div>

      <div className="text-xs text-gray-400 space-y-1">
        <p>• 条件は上から順に評価され、最初にマッチしたグループに振り分けられます</p>
        <p>• 後続のターゲットで routerGroup を指定して、特定グループのみ受け取れます</p>
      </div>
    </div>
  );
};

export default RouterConfigPanel;
