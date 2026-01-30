// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { VirtualDBProvider, useVirtualDB } from './VirtualDB';

describe('VirtualDB', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <VirtualDBProvider>{children}</VirtualDBProvider>
  );

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
});
