# 計画: インフラストラクチャとコネクションを別タブに移動

## 概要
設定パネルの `InfrastructureSettings` と `ConnectionSettings` を新しい独立したタブに移動する。

## 現在の構成
| タブ | 含まれるコンポーネント |
|------|----------------------|
| Data Source | InfrastructureSettings, DataSourceSettings |
| Data Hub | TopicSettings, CollectionSettings, DeliverySettings |
| Data Integration | **ConnectionSettings**, MappingDesigner, MappingTaskSettings, TaskFlowDesigner |
| Database | DatabaseSettings |
| BI Dashboard | BiDashboardSettings |

## 変更後の構成
| タブ | 含まれるコンポーネント |
|------|----------------------|
| **Infrastructure** (新規) | **InfrastructureSettings, ConnectionSettings** |
| Data Source | DataSourceSettings |
| Data Hub | TopicSettings, CollectionSettings, DeliverySettings |
| Data Integration | MappingDesigner, MappingTaskSettings, TaskFlowDesigner |
| Database | DatabaseSettings |
| BI Dashboard | BiDashboardSettings |

## 修正対象ファイル
- `src/components/settings/SettingsPanel.tsx`

## 実装手順

### 1. タブ定義の更新
```typescript
type SettingsTab = 'infrastructure' | 'datasource' | 'integrationHub' | 'dataIntegration' | 'database' | 'bi';
```

### 2. tabs配列に新しいタブを追加（先頭に配置）
```typescript
{ id: 'infrastructure', label: 'Infrastructure', icon: <Network size={16} /> }
```

### 3. 新しいタブのコンテンツを追加
```tsx
{activeTab === 'infrastructure' && (
  <div className="space-y-6">
    <InfrastructureSettings />
    <ConnectionSettings />
  </div>
)}
```

### 4. datasource タブから InfrastructureSettings を削除

### 5. dataIntegration タブから ConnectionSettings を削除

### 6. lucide-react から Network アイコンをインポート

## 検証方法
1. `npm run build` でTypeScriptエラーがないことを確認
2. `npm run dev` で開発サーバーを起動
3. Settings タブで以下を確認:
   - 新しい "Infrastructure" タブが表示される
   - Infrastructure タブに InfrastructureSettings と ConnectionSettings が表示される
   - Data Source タブには DataSourceSettings のみ表示される
   - Data Integration タブには ConnectionSettings が表示されない
