/**
 * コネクションコンテキスト
 * 接続定義（ファイル・データベース）の管理を担当する専門Context
 */
import React, { createContext, useContext, useState, type ReactNode, useCallback, useEffect } from 'react';
import { type ConnectionDefinition } from '../types';

interface ConnectionContextType {
  connections: ConnectionDefinition[];
  addConnection: (conn: Omit<ConnectionDefinition, 'id'>) => void;
  removeConnection: (id: string) => void;
  updateConnection: (id: string, updates: Partial<ConnectionDefinition>) => void;
  setConnections: React.Dispatch<React.SetStateAction<ConnectionDefinition[]>>;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

export const ConnectionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [connections, setConnections] = useState<ConnectionDefinition[]>([
    {
      id: 'conn_raw',
      name: 'Raw Data Source (File)',
      type: 'file',
      host: 'localhost'
    },
    {
      id: 'conn_raw_db',
      name: 'Raw Database',
      type: 'database',
      host: 'localhost'
    },
    {
      id: 'conn_summary_db',
      name: 'Summary Database',
      type: 'database',
      host: 'localhost'
    },
    {
        id: 'conn_src_host1',
        name: 'Source (Host1)',
        type: 'file',
        host: 'host1'
    },
    {
        id: 'conn_incoming',
        name: 'Incoming Folder',
        type: 'file',
        host: 'localhost'
    },
    {
        id: 'conn_internal',
        name: 'Internal Folder',
        type: 'file',
        host: 'localhost'
    }
  ]);

  useEffect(() => {
    const saved = localStorage.getItem('pipeline-simulator-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.connections) setConnections(parsed.connections);
      } catch {
        // console.error('Failed to load connections', e);
      }
    }
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
    <ConnectionContext.Provider value={{
      connections, addConnection, removeConnection, updateConnection, setConnections
    }}>
      {children}
    </ConnectionContext.Provider>
  );
};

export const useConnection = () => {
  const context = useContext(ConnectionContext);
  if (context === undefined) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
};
