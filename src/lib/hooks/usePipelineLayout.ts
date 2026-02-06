import { useCallback, useMemo } from 'react';
import { type Node, type Edge, Position } from 'reactflow';
import dagre from 'dagre';
import { UI, NODE_DIMENSIONS, LAYOUT } from '../constants';

interface LayoutOptions {
  /** レイアウト方向（デフォルト: 'LR' - 左から右）*/
  rankdir?: 'TB' | 'BT' | 'LR' | 'RL';
  /** ノード間の水平方向の間隔 */
  nodesep?: number;
  /** ランク（層）間の垂直方向の間隔 */
  ranksep?: number;
}

interface LayoutResult {
  /** レイアウト計算を実行する関数 */
  calculateLayout: (nodes: Node[], edges: Edge[]) => Node[];
  /** ノードのサイズ取得関数 */
  getNodeDimensions: (node: Node) => { width: number; height: number };
}

/**
 * dagreを使用したパイプラインレイアウト計算を提供するカスタムフック。
 * レイアウト計算ロジックをメモ化し、不要な再計算を防止。
 */
export function usePipelineLayout(options: LayoutOptions = {}): LayoutResult {
  const { rankdir = 'LR', nodesep = LAYOUT.NODE_SEP, ranksep = LAYOUT.RANK_SEP } = options;

  // ノードサイズの計算関数をメモ化
  const getNodeDimensions = useCallback((node: Node) => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < UI.MOBILE_BREAKPOINT;
    const baseWidth = node.type === 'storage' ? NODE_DIMENSIONS.STORAGE_WIDTH : NODE_DIMENSIONS.PROCESS_WIDTH;
    const baseHeight = node.type === 'storage' ? NODE_DIMENSIONS.STORAGE_HEIGHT : NODE_DIMENSIONS.PROCESS_HEIGHT;

    return {
      width: isMobile ? baseWidth * NODE_DIMENSIONS.MOBILE_SCALE : baseWidth,
      height: isMobile ? baseHeight * NODE_DIMENSIONS.MOBILE_SCALE : baseHeight,
    };
  }, []);

  // レイアウト計算関数をメモ化
  const calculateLayout = useCallback((nodes: Node[], edges: Edge[]): Node[] => {
    if (nodes.length === 0) return nodes;

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir, nodesep, ranksep });

    // ノードをグラフに追加
    nodes.forEach((node) => {
      const { width, height } = getNodeDimensions(node);
      dagreGraph.setNode(node.id, { width, height });
    });

    // エッジをグラフに追加
    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    // レイアウト計算実行
    dagre.layout(dagreGraph);

    // 計算結果を適用した新しいノード配列を返す
    return nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      const { width, height } = getNodeDimensions(node);

      return {
        ...node,
        targetPosition: Position.Left,
        sourcePosition: Position.Right,
        width,
        height,
        position: {
          x: nodeWithPosition.x - width / 2,
          y: nodeWithPosition.y - height / 2,
        },
      };
    });
  }, [rankdir, nodesep, ranksep, getNodeDimensions]);

  return useMemo(() => ({
    calculateLayout,
    getNodeDimensions,
  }), [calculateLayout, getNodeDimensions]);
}

export default usePipelineLayout;
