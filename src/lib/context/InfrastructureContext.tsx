import React, { createContext, useContext, useState, type ReactNode, useCallback, useEffect } from 'react';
import { type ConnectionDefinition, type Host } from '../types';

interface InfrastructureContextType {
  hosts: Host[];
  addHost: (name: string) => void;
  removeHost: (name: string) => void;
  addDirectory: (hostName: string, path: string) => void;
  removeDirectory: (hostName: string, path: string) => void;
  setHosts: React.Dispatch<React.SetStateAction<Host[]>>;

  connections: ConnectionDefinition[];
  addConnection: (conn: Omit<ConnectionDefinition, 'id'>) => void;
  removeConnection: (id: string) => void;
  updateConnection: (id: string, updates: Partial<ConnectionDefinition>) => void;
  setConnections: React.Dispatch<React.SetStateAction<ConnectionDefinition[]>>;
}

const InfrastructureContext = createContext<InfrastructureContextType | undefined>(undefined);

export const InfrastructureProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [hosts, setHosts] = useState<Host[]>([
    { name: 'host1', directories: ['/source'] },
    { name: 'host2', directories: ['/source'] },
    { name: 'localhost', directories: ['/incoming', '/internal'] },
  ]);

  const [connections, setConnections] = useState<ConnectionDefinition[]>([
    {
      id: 'conn_raw',
      name: 'Raw Data Source (File)',
      type: 'file',
      host: 'localhost',
      path: '/internal'
    },
    {
      id: 'conn_raw_db',
      name: 'Raw Database',
      type: 'database',
      tableName: 'raw_data'
    },
    {
      id: 'conn_summary_db',
      name: 'Summary Database',
      type: 'database',
      tableName: 'summary_data'
    },
    {
        id: 'conn_src_host1',
        name: 'Source (Host1)',
        type: 'file',
        host: 'host1',
        path: '/source'
    },
    {
        id: 'conn_incoming',
        name: 'Incoming Folder',
        type: 'file',
        host: 'localhost',
        path: '/incoming'
    },
    {
        id: 'conn_internal',
        name: 'Internal Folder',
        type: 'file',
        host: 'localhost',
        path: '/internal'
    }
  ]);

  // Load from local storage (部分的な読み込みロジックが必要だが、一旦初期値で実装し、後で統合ロードロジックを入れる)
  // 今回はリファクタリングなので、初期ロードは上位のCoordinatorで行うか、各ContextでLocalStorageを見るか...
  // 既存のSettingsContextが巨大なJSONを一括保存しているので、互換性を保つには
  // 「初期化時にlocalStorage全体を読んで自分の担当分だけセットする」のが良さそうです。

  useEffect(() => {
    const saved = localStorage.getItem('pipeline-simulator-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.hosts) setHosts(parsed.hosts);
        if (parsed.connections) setConnections(parsed.connections);
      } catch {
        // console.error('Failed to load infrastructure settings', e);
      }
    }
  }, []);

  const addHost = useCallback((name: string) => {
    setHosts(prev => {
      if (prev.some(h => h.name === name)) return prev;
      return [...prev, { name, directories: [] }];
    });
  }, []);

  const removeHost = useCallback((name: string) => {
    setHosts(prev => prev.filter(h => h.name !== name));
  }, []);

  const addDirectory = useCallback((hostName: string, path: string) => {
    setHosts(prev => prev.map(h => {
      if (h.name !== hostName) return h;
      if (h.directories.includes(path)) return h;
      return { ...h, directories: [...h.directories, path] };
    }));
  }, []);

  const removeDirectory = useCallback((hostName: string, path: string) => {
    setHosts(prev => prev.map(h => {
      if (h.name !== hostName) return h;
      return { ...h, directories: h.directories.filter(d => d !== path) };
    }));
  }, []);

  const addConnection = useCallback((conn: Omit<ConnectionDefinition, 'id'>) => {
    setConnections(prev => [...prev, { ...conn, id: `conn_${Date.now()}` }]);
  }, []);

  const removeConnection = useCallback((id: string) => {
    setConnections(prev => prev.filter(c => c.id !== id));
  }, []);

  const updateConnection = useCallback((id: string, updates: Partial<ConnectionDefinition>) => {
    setConnections(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  return (
    <InfrastructureContext.Provider value={{
      hosts, addHost, removeHost, addDirectory, removeDirectory, setHosts,
      connections, addConnection, removeConnection, updateConnection, setConnections
    }}>
      {children}
    </InfrastructureContext.Provider>
  );
};

export const useInfrastructure = () => {
  const context = useContext(InfrastructureContext);
  if (context === undefined) {
    throw new Error('useInfrastructure must be used within a InfrastructureProvider');
  }
  return context;
};
