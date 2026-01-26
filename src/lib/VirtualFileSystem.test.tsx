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
      result.current.writeFile('localhost', '/source', 'test.csv', 'content');
    });

    expect(result.current.files).toHaveLength(1);
    expect(result.current.files[0].name).toBe('test.csv');
    expect(result.current.files[0].path).toBe('/source');
    expect(result.current.files[0].host).toBe('localhost');
  });

  it('should move a file', () => {
    const { result } = renderHook(() => useFileSystem(), {
      wrapper: FileSystemProvider,
    });

    act(() => {
      result.current.writeFile('localhost', '/source', 'test.csv', 'content');
    });

    act(() => {
        result.current.moveFile('test.csv', 'localhost', '/source', 'localhost', '/incoming');
    });

    const file = result.current.files[0];
    expect(file.path).toBe('/incoming');
    expect(file.host).toBe('localhost');
  });

  it('should move and rename a file', () => {
    const { result } = renderHook(() => useFileSystem(), {
      wrapper: FileSystemProvider,
    });

    act(() => {
      result.current.writeFile('localhost', '/source', 'original.csv', 'content');
    });

    act(() => {
        result.current.moveFile('original.csv', 'localhost', '/source', 'remote-host', '/dest', 'renamed.csv');
    });

    const file = result.current.files[0];
    expect(file.host).toBe('remote-host');
    expect(file.path).toBe('/dest');
    expect(file.name).toBe('renamed.csv');
  });

   it('should delete a file', () => {
    const { result } = renderHook(() => useFileSystem(), {
      wrapper: FileSystemProvider,
    });

    act(() => {
      result.current.writeFile('localhost', '/source', 'test.csv', 'content');
    });

    act(() => {
        result.current.deleteFile('localhost', 'test.csv', '/source');
    });

    expect(result.current.files).toHaveLength(0);
  });
});
