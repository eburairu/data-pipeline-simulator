// @vitest-environment happy-dom
/**
 * usePipelineLayoutフックのユニットテスト
 * dagreを使用したパイプラインレイアウト計算のテスト
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { type Node, type Edge } from 'reactflow';
import { usePipelineLayout } from './usePipelineLayout';

// テスト用のノードデータ
const createTestNodes = (): Node[] => [
  { id: 'node-1', type: 'process', position: { x: 0, y: 0 }, data: { label: 'Node 1' } },
  { id: 'node-2', type: 'process', position: { x: 0, y: 0 }, data: { label: 'Node 2' } },
  { id: 'node-3', type: 'storage', position: { x: 0, y: 0 }, data: { label: 'Node 3' } },
];

// テスト用のエッジデータ
const createTestEdges = (): Edge[] => [
  { id: 'edge-1-2', source: 'node-1', target: 'node-2' },
  { id: 'edge-2-3', source: 'node-2', target: 'node-3' },
];

describe('usePipelineLayout', () => {
  beforeEach(() => {
    // window.innerWidthをモック（デスクトップサイズ）
    vi.stubGlobal('innerWidth', 1024);
  });

  describe('getNodeDimensions', () => {
    it('processノードのサイズを正しく計算する', () => {
      const { result } = renderHook(() => usePipelineLayout());

      const processNode: Node = { id: '1', type: 'process', position: { x: 0, y: 0 }, data: {} };
      const dimensions = result.current.getNodeDimensions(processNode);

      // デスクトップサイズ: 180x80
      expect(dimensions.width).toBe(180);
      expect(dimensions.height).toBe(80);
    });

    it('storageノードのサイズを正しく計算する', () => {
      const { result } = renderHook(() => usePipelineLayout());

      const storageNode: Node = { id: '1', type: 'storage', position: { x: 0, y: 0 }, data: {} };
      const dimensions = result.current.getNodeDimensions(storageNode);

      // デスクトップサイズ: 220x120
      expect(dimensions.width).toBe(220);
      expect(dimensions.height).toBe(120);
    });

    it('モバイルサイズでは縮小されたサイズを返す', () => {
      // モバイルサイズに変更
      vi.stubGlobal('innerWidth', 600);

      const { result } = renderHook(() => usePipelineLayout());

      const processNode: Node = { id: '1', type: 'process', position: { x: 0, y: 0 }, data: {} };
      const dimensions = result.current.getNodeDimensions(processNode);

      // モバイルサイズ: 180 * 0.8 = 144, 80 * 0.8 = 64
      expect(dimensions.width).toBe(144);
      expect(dimensions.height).toBe(64);
    });
  });

  describe('calculateLayout', () => {
    it('空のノード配列を正しく処理する', () => {
      const { result } = renderHook(() => usePipelineLayout());

      const layoutedNodes = result.current.calculateLayout([], []);

      expect(layoutedNodes).toEqual([]);
    });

    it('単一ノードのレイアウトを計算する', () => {
      const { result } = renderHook(() => usePipelineLayout());

      const nodes: Node[] = [
        { id: 'node-1', type: 'process', position: { x: 0, y: 0 }, data: { label: 'Node 1' } },
      ];

      const layoutedNodes = result.current.calculateLayout(nodes, []);

      expect(layoutedNodes).toHaveLength(1);
      expect(layoutedNodes[0].position).toBeDefined();
      expect(typeof layoutedNodes[0].position.x).toBe('number');
      expect(typeof layoutedNodes[0].position.y).toBe('number');
      expect(layoutedNodes[0].width).toBe(180);
      expect(layoutedNodes[0].height).toBe(80);
    });

    it('複数ノードとエッジのレイアウトを計算する', () => {
      const { result } = renderHook(() => usePipelineLayout());

      const nodes = createTestNodes();
      const edges = createTestEdges();

      const layoutedNodes = result.current.calculateLayout(nodes, edges);

      expect(layoutedNodes).toHaveLength(3);

      // すべてのノードに位置が設定されている
      layoutedNodes.forEach((node) => {
        expect(node.position).toBeDefined();
        expect(typeof node.position.x).toBe('number');
        expect(typeof node.position.y).toBe('number');
        expect(node.width).toBeDefined();
        expect(node.height).toBeDefined();
      });

      // 左から右のレイアウトなので、node-1のx座標が最小
      const node1 = layoutedNodes.find((n) => n.id === 'node-1');
      const node2 = layoutedNodes.find((n) => n.id === 'node-2');
      const node3 = layoutedNodes.find((n) => n.id === 'node-3');

      expect(node1!.position.x).toBeLessThan(node2!.position.x);
      expect(node2!.position.x).toBeLessThan(node3!.position.x);
    });

    it('sourcePositionとtargetPositionが設定される', () => {
      const { result } = renderHook(() => usePipelineLayout());

      const nodes = createTestNodes();
      const edges = createTestEdges();

      const layoutedNodes = result.current.calculateLayout(nodes, edges);

      layoutedNodes.forEach((node) => {
        expect(node.sourcePosition).toBe('right');
        expect(node.targetPosition).toBe('left');
      });
    });
  });

  describe('レイアウトオプション', () => {
    it('カスタムrankdirオプションを適用する', () => {
      const { result } = renderHook(() => usePipelineLayout({ rankdir: 'TB' }));

      const nodes = createTestNodes();
      const edges = createTestEdges();

      const layoutedNodes = result.current.calculateLayout(nodes, edges);

      // 上から下のレイアウトなので、node-1のy座標が最小
      const node1 = layoutedNodes.find((n) => n.id === 'node-1');
      const node2 = layoutedNodes.find((n) => n.id === 'node-2');
      const node3 = layoutedNodes.find((n) => n.id === 'node-3');

      expect(node1!.position.y).toBeLessThan(node2!.position.y);
      expect(node2!.position.y).toBeLessThan(node3!.position.y);
    });

    it('カスタムranksepオプションを適用する', () => {
      // 広い間隔と狭い間隔でレイアウト計算
      const { result: wideResult } = renderHook(() => usePipelineLayout({ ranksep: 200 }));
      const { result: narrowResult } = renderHook(() => usePipelineLayout({ ranksep: 10 }));

      const nodes = createTestNodes();
      const edges = createTestEdges();

      const wideLayout = wideResult.current.calculateLayout(nodes, edges);
      const narrowLayout = narrowResult.current.calculateLayout(nodes, edges);

      // 広いランク間隔の方がノード間の距離が大きい
      const wideNode1 = wideLayout.find((n) => n.id === 'node-1');
      const wideNode3 = wideLayout.find((n) => n.id === 'node-3');
      const narrowNode1 = narrowLayout.find((n) => n.id === 'node-1');
      const narrowNode3 = narrowLayout.find((n) => n.id === 'node-3');

      const wideSpread = Math.abs(wideNode3!.position.x - wideNode1!.position.x);
      const narrowSpread = Math.abs(narrowNode3!.position.x - narrowNode1!.position.x);

      expect(wideSpread).toBeGreaterThan(narrowSpread);
    });
  });

  describe('メモ化の動作', () => {
    it('同じオプションでフックを再レンダリングしても同じ関数参照を返す', () => {
      const { result, rerender } = renderHook(() => usePipelineLayout({ rankdir: 'LR' }));

      const firstCalculateLayout = result.current.calculateLayout;
      const firstGetNodeDimensions = result.current.getNodeDimensions;

      rerender();

      expect(result.current.calculateLayout).toBe(firstCalculateLayout);
      expect(result.current.getNodeDimensions).toBe(firstGetNodeDimensions);
    });

    it('オプションが変更されると新しい関数参照を返す', () => {
      type LayoutOptions = { rankdir?: 'TB' | 'BT' | 'LR' | 'RL' };
      const { result, rerender } = renderHook(
        ({ options }: { options: LayoutOptions }) => usePipelineLayout(options),
        { initialProps: { options: { rankdir: 'LR' } as LayoutOptions } }
      );

      const firstCalculateLayout = result.current.calculateLayout;

      rerender({ options: { rankdir: 'TB' } as LayoutOptions });

      expect(result.current.calculateLayout).not.toBe(firstCalculateLayout);
    });
  });
});
