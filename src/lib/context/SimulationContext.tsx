/**
 * シミュレーションコンテキスト
 * ホスト・ディレクトリ管理を担当する専門Context
 */
import React, { createContext, useContext, useState, type ReactNode, useCallback, useEffect } from 'react';
import { type Host } from '../types';

interface SimulationContextType {
  hosts: Host[];
  addHost: (name: string) => void;
  removeHost: (name: string) => void;
  addDirectory: (hostName: string, path: string) => void;
  removeDirectory: (hostName: string, path: string) => void;
  setHosts: React.Dispatch<React.SetStateAction<Host[]>>;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export const SimulationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [hosts, setHosts] = useState<Host[]>([
    { name: 'host1', directories: ['/source'] },
    { name: 'host2', directories: ['/source'] },
    { name: 'localhost', directories: ['/incoming', '/internal'] },
  ]);

  useEffect(() => {
    const saved = localStorage.getItem('pipeline-simulator-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.hosts) setHosts(parsed.hosts);
      } catch {
        // ignore
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

  return (
    <SimulationContext.Provider value={{
      hosts, addHost, removeHost, addDirectory, removeDirectory, setHosts
    }}>
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulation = () => {
  const context = useContext(SimulationContext);
  if (context === undefined) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
};
