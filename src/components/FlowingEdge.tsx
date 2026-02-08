import React, { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, type EdgeProps, getBezierPath } from 'reactflow';

const FlowingEdge: React.FC<EdgeProps> = ({
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  style = {},
  markerEnd,
  data,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // データプロパティからアニメーション状態を取得（デフォルトはfalse）
  const isAnimating = data?.isAnimating || false;
  
  // アニメーションの色（デフォルトは青）
  const particleColor = data?.color || '#3b82f6';

  // 数値表示（MetricEdgeの機能統合）
  const count = data?.count || 0;

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      
      {isAnimating && (
        <circle r="3" fill={particleColor}>
          <animateMotion 
            dur="1.5s" 
            repeatCount="indefinite" 
            path={edgePath}
            calcMode="linear"
          />
        </circle>
      )}
      
      {/* 複数の粒子を流す場合 */}
      {isAnimating && data?.intensity === 'high' && (
        <circle r="3" fill={particleColor}>
          <animateMotion 
            dur="1.5s" 
            begin="0.75s"
            repeatCount="indefinite" 
            path={edgePath}
            calcMode="linear"
          />
        </circle>
      )}

      {/* 数値ラベル表示 */}
      {count > 0 && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 10,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <div className="bg-blue-600 text-white rounded-full px-2 py-0.5 shadow-sm text-[9px] font-bold border border-white z-10">
              {count.toLocaleString()}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default memo(FlowingEdge);
