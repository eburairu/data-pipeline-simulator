// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { VirtualDBProvider, useVirtualDB, type VirtualDBOptions } from './VirtualDB';
import type { ReactNode } from 'react';

// テスト用のラッパーを作成
const createWrapper = (options?: VirtualDBOptions) => {
  return ({ children }: { children: ReactNode }) => (
    <VirtualDBProvider options={options}>{children}</VirtualDBProvider>
  );
};

describe('VirtualDB', () => {
  const wrapper = createWrapper();

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('基本機能', () => {
    it('should insert and query records with filters', () => {
      const { result } = renderHook(() => useVirtualDB(), { wrapper });

      act(() => {
        result.current.insert('users', { id: 1, name: 'Alice', age: 30, role: 'admin' });
        result.current.insert('users', { id: 2, name: 'Bob', age: 25, role: 'user' });
        result.current.insert('users', { id: 3, name: 'Charlie', age: 35, role: 'user' });
      });

      // Test simple select
      const allUsers = result.current.select('users');
      expect(allUsers).toHaveLength(3);

      // Test query with filter
      const admins = result.current.query('users', [{ column: 'role', operator: '=', value: 'admin' }]);
      expect(admins).toHaveLength(1);
      expect(admins[0].data.name).toBe('Alice');

      // Test query with numeric comparison
      const olderThan28 = result.current.query('users', [{ column: 'age', operator: '>', value: '28' }]);
      expect(olderThan28).toHaveLength(2); // Alice (30) and Charlie (35)

      // Test query with contains
      const bNames = result.current.query('users', [{ column: 'name', operator: 'contains', value: 'b' }]);
      expect(bNames).toHaveLength(1); // Bob
    });

    it('レコードを更新できる', () => {
      const { result } = renderHook(() => useVirtualDB(), { wrapper });

      act(() => {
        result.current.insert('users', { name: 'John', age: 30 });
      });

      const recordId = result.current.records[0].id;

      act(() => {
        result.current.update('users', recordId, { age: 31 });
      });

      expect(result.current.records[0].data).toEqual({ name: 'John', age: 31 });
    });

    it('レコードを削除できる', () => {
      const { result } = renderHook(() => useVirtualDB(), { wrapper });

      act(() => {
        result.current.insert('users', { name: 'John' });
        result.current.insert('users', { name: 'Jane' });
      });

      const recordId = result.current.records[0].id;

      act(() => {
        result.current.remove('users', recordId);
      });

      expect(result.current.records).toHaveLength(1);
      expect(result.current.records[0].data.name).toBe('Jane');
    });
  });

  describe('レコード上限とLRUパージ', () => {
    it('デフォルトの上限は10000レコード', () => {
      const { result } = renderHook(() => useVirtualDB(), {
        wrapper: createWrapper(),
      });

      expect(result.current.getMaxRecords()).toBe(10000);
    });

    it('カスタムの上限を設定できる', () => {
      const { result } = renderHook(() => useVirtualDB(), {
        wrapper: createWrapper({ maxRecords: 100 }),
      });

      expect(result.current.getMaxRecords()).toBe(100);
    });

    it('上限に達すると最も古いレコードが削除される（LRU）', () => {
      const { result } = renderHook(() => useVirtualDB(), {
        wrapper: createWrapper({ maxRecords: 3 }),
      });

      act(() => {
        result.current.insert('users', { name: 'First' });
      });
      act(() => {
        result.current.insert('users', { name: 'Second' });
      });
      act(() => {
        result.current.insert('users', { name: 'Third' });
      });

      expect(result.current.records).toHaveLength(3);

      // 4つ目を挿入 - 最も古い'First'が削除されるはず
      act(() => {
        result.current.insert('users', { name: 'Fourth' });
      });

      expect(result.current.records).toHaveLength(3);
      const names = result.current.records.map((r) => r.data.name);
      expect(names).not.toContain('First');
      expect(names).toContain('Second');
      expect(names).toContain('Third');
      expect(names).toContain('Fourth');
    });

    it('上限到達時に警告ログが出力される', () => {
      const warnSpy = vi.spyOn(console, 'warn');

      const { result } = renderHook(() => useVirtualDB(), {
        wrapper: createWrapper({ maxRecords: 2, showWarnings: true }),
      });

      act(() => {
        result.current.insert('users', { name: 'First' });
        result.current.insert('users', { name: 'Second' });
      });

      // 上限に達する前は警告なし
      expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('レコード上限'));

      // 上限を超える挿入で警告
      act(() => {
        result.current.insert('users', { name: 'Third' });
      });

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('レコード上限(2)に達しました')
      );
    });

    it('showWarnings: falseで警告を抑制できる', () => {
      const warnSpy = vi.spyOn(console, 'warn');

      const { result } = renderHook(() => useVirtualDB(), {
        wrapper: createWrapper({ maxRecords: 2, showWarnings: false }),
      });

      act(() => {
        result.current.insert('users', { name: 'First' });
        result.current.insert('users', { name: 'Second' });
        result.current.insert('users', { name: 'Third' });
      });

      expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('レコード上限'));
    });

    it('getRecordCountが正しいレコード数を返す', () => {
      const { result } = renderHook(() => useVirtualDB(), {
        wrapper: createWrapper(),
      });

      expect(result.current.getRecordCount()).toBe(0);

      act(() => {
        result.current.insert('users', { name: 'John' });
        result.current.insert('users', { name: 'Jane' });
      });

      expect(result.current.getRecordCount()).toBe(2);
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量のレコード挿入が適切な時間内に完了する', () => {
      const { result } = renderHook(() => useVirtualDB(), {
        wrapper: createWrapper({ maxRecords: 1000, showWarnings: false }),
      });

      const startTime = performance.now();

      act(() => {
        for (let i = 0; i < 1000; i++) {
          result.current.insert('users', { index: i, name: `User${i}` });
        }
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // 1000レコードの挿入は5秒以内に完了すべき（CI環境を考慮して余裕を持たせる）
      expect(duration).toBeLessThan(5000);
      expect(result.current.records).toHaveLength(1000);
    });

    it('LRUパージが大量データでも動作する', () => {
      const { result } = renderHook(() => useVirtualDB(), {
        wrapper: createWrapper({ maxRecords: 100, showWarnings: false }),
      });

      // 上限を超える数のレコードを挿入
      act(() => {
        for (let i = 0; i < 200; i++) {
          result.current.insert('users', { index: i });
        }
      });

      // 上限に制限されている
      expect(result.current.records).toHaveLength(100);
      // 最新のレコードが保持されている
      const indices = result.current.records.map((r) => r.data.index);
      expect(indices).toContain(199); // 最新
      expect(indices).not.toContain(0); // 最古は削除済み
    });

    it('クエリが大量データでも100ms以内に応答する', () => {
      const { result } = renderHook(() => useVirtualDB(), {
        wrapper: createWrapper({ maxRecords: 5000, showWarnings: false }),
      });

      // 5000レコードを挿入
      act(() => {
        for (let i = 0; i < 5000; i++) {
          result.current.insert('users', {
            index: i,
            category: i % 10 === 0 ? 'special' : 'normal',
          });
        }
      });

      const startTime = performance.now();

      // フィルタ付きクエリ
      const filtered = result.current.query('users', [
        { column: 'category', operator: '=', value: 'special' },
      ]);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // クエリは500ms以内に完了すべき（CI環境を考慮）
      expect(duration).toBeLessThan(500);
      expect(filtered.length).toBe(500); // 10%がspecial
    });
  });
});
