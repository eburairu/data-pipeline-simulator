/**
 * Union変換の設定パネル
 * 複数の入力ソースを結合する設定を行う
 *
 * Union変換は設定パラメータを持たず、
 * 複数の入力からのデータをそのまま結合する
 */
import React from 'react';
import { Merge } from 'lucide-react';
import type { TransformationConfigProps } from './types';

const UnionConfigPanel: React.FC<TransformationConfigProps> = ({
  mapping,
  transformationId,
}) => {
  // この変換への入力リンク数をカウント
  const inputLinks = mapping.links.filter(
    (link) => link.targetId === transformationId
  );
  const inputCount = inputLinks.length;

  return (
    <div className="space-y-4">
      <div className="border rounded p-3 bg-blue-50">
        <div className="flex items-center gap-2 mb-2">
          <Merge size={16} className="text-blue-600" />
          <span className="text-sm font-medium text-blue-800">
            Union変換
          </span>
        </div>
        <p className="text-xs text-blue-700">
          複数の入力ソースからのデータを1つのストリームに結合します。
        </p>
      </div>

      <div className="border rounded p-3 bg-gray-50">
        <label className="block text-xs text-gray-500 font-medium mb-1">
          入力ソース数
        </label>
        <p className="text-lg font-medium">
          {inputCount} 個
        </p>
        {inputCount < 2 && (
          <p className="text-xs text-orange-600 mt-1">
            ※ Union変換には2つ以上の入力が必要です
          </p>
        )}
      </div>

      <div className="text-xs text-gray-400 space-y-1">
        <p>• 入力ソースは同じスキーマ（フィールド構造）を持つ必要があります</p>
        <p>• すべての入力データは順序を保持せずに結合されます</p>
        <p>• 重複排除が必要な場合は、後続にDeduplicator変換を追加してください</p>
      </div>
    </div>
  );
};

export default UnionConfigPanel;
