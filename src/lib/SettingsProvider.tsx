/**
 * 統合設定プロバイダー
 * 各専門Contextを組み合わせ、ファサードを通じて後方互換性を維持
 */
import React, { type ReactNode } from 'react';
import { ConnectionProvider } from './context/ConnectionContext';
import { SimulationProvider } from './context/SimulationContext';
import { DataSourceProvider } from './context/DataSourceContext';
import { PipelineProvider } from './context/PipelineContext';
import { UIProvider } from './context/UIContext';
import { SettingsContextFacade } from './SettingsContext';

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <SimulationProvider>
      <ConnectionProvider>
        <DataSourceProvider>
          <PipelineProvider>
            <UIProvider>
              <SettingsContextFacade>
                {children}
              </SettingsContextFacade>
            </UIProvider>
          </PipelineProvider>
        </DataSourceProvider>
      </ConnectionProvider>
    </SimulationProvider>
  );
};
