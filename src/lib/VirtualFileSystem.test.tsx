// @vitest-environment happy-dom
import { renderHook, act } from '@testing-library/react';
import { useFileSystem, FileSystemProvider } from './VirtualFileSystem';
import { describe, it, expect } from 'vitest';

describe('useFileSystem', () => {
  it('should write a file', () => {
    const { result } = renderHook(() => useFileSystem(), {
      wrapper: FileSystemProvider,
    });

    act(() => {
      result.current.writeFile('/source', 'test.csv', 'content');
    });

    expect(result.current.files).toHaveLength(1);
    expect(result.current.files[0].name).toBe('test.csv');
    expect(result.current.files[0].path).toBe('/source');
  });

  it('should move a file', () => {
    const { result } = renderHook(() => useFileSystem(), {
      wrapper: FileSystemProvider,
    });

    act(() => {
      result.current.writeFile('/source', 'test.csv', 'content');
    });

    act(() => {
        result.current.moveFile('test.csv', '/source', '/incoming');
    });

    const file = result.current.files[0];
    expect(file.path).toBe('/incoming');
  });

   it('should delete a file', () => {
    const { result } = renderHook(() => useFileSystem(), {
      wrapper: FileSystemProvider,
    });

    act(() => {
      result.current.writeFile('/source', 'test.csv', 'content');
    });

    act(() => {
        result.current.deleteFile('test.csv', '/source');
    });

    expect(result.current.files).toHaveLength(0);
  });
});
