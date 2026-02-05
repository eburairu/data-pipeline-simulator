/**
 * UIコンテキスト
 * BIダッシュボード設定など表示関連の状態を管理する専門Context
 */
import React, { createContext, useContext, useState, type ReactNode, useEffect } from 'react';
import { type BiDashboardSettings } from '../types';
import { migrateBiDashboardSettings } from '../migrations/DataMigration';

interface UIContextType {
  biDashboard: BiDashboardSettings;
  setBiDashboard: React.Dispatch<React.SetStateAction<BiDashboardSettings>>;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [biDashboard, setBiDashboard] = useState<BiDashboardSettings>({
    showDashboard: true,
    items: [],
  });

  useEffect(() => {
    const saved = localStorage.getItem('pipeline-simulator-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const migratedBI = migrateBiDashboardSettings(parsed);
        if (migratedBI) setBiDashboard(migratedBI);
      } catch (e) {
        // ignore
      }
    }
  }, []);

  return (
    <UIContext.Provider value={{
      biDashboard, setBiDashboard
    }}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};
