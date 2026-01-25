import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export interface DBRecord {
  id: string;
  data: Record<string, unknown>;
  table: string;
  insertedAt: number;
}

interface VirtualDBContextType {
  records: DBRecord[];
  insert: (table: string, data: Record<string, unknown>) => void;
  select: (table: string) => DBRecord[];
}

const VirtualDBContext = createContext<VirtualDBContextType | undefined>(undefined);

export const VirtualDBProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [records, setRecords] = useState<DBRecord[]>([]);

  const insert = useCallback((table: string, data: Record<string, unknown>) => {
    const newRecord: DBRecord = {
      id: Math.random().toString(36).substring(7),
      data,
      table,
      insertedAt: Date.now(),
    };
    setRecords((prev) => [...prev, newRecord]);
    console.log(`[DB] Inserted into ${table}:`, data);
  }, []);

  const select = (table: string) => {
    return records.filter((r) => r.table === table);
  };

  return (
    <VirtualDBContext.Provider value={{ records, insert, select }}>
      {children}
    </VirtualDBContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useVirtualDB = () => {
  const context = useContext(VirtualDBContext);
  if (!context) {
    throw new Error('useVirtualDB must be used within a VirtualDBProvider');
  }
  return context;
};
