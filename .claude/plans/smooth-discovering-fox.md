# 接続選択後のパス/テーブル選択UI追加計画

## 概要

MappingDesignerのSource/Target/Lookup設定において、接続オブジェクトを選択した後にパス（ファイル接続時）またはテーブル（データベース接続時）を選択式で選べるようにする。

## 現状

- **接続（Connection）選択**: 実装済み（ドロップダウン）
- **パス（path）設定**: UIなし（型定義のみ存在）
- **テーブル（tableName）設定**: UIなし（型定義のみ存在）

## 変更対象ファイル

- [MappingDesigner.tsx](src/components/settings/MappingDesigner.tsx) - メイン変更対象

## 実装手順

### 1. SettingsContextからhosts/tablesを追加取得

**行154付近**
```typescript
// Before
const { mappings, addMapping, updateMapping, removeMapping, connections } = useSettings();

// After
const { mappings, addMapping, updateMapping, removeMapping, connections, hosts, tables } = useSettings();
```

### 2. 接続情報取得ヘルパー関数を追加

**154行目以降に追加**
```typescript
const getConnectionInfo = useCallback((connectionId: string) => {
    const connection = connections.find(c => c.id === connectionId);
    if (!connection) return null;

    if (connection.type === 'file') {
        const host = hosts.find(h => h.name === connection.host);
        return { type: 'file' as const, directories: host?.directories || [] };
    } else {
        return { type: 'database' as const, tables: tables };
    }
}, [connections, hosts, tables]);
```

### 3. Source設定UI拡張（504-534行目）

接続選択の直後に、接続タイプに応じたpath/tableName選択を追加：
- `type === 'file'`: ディレクトリ一覧からpathを選択
- `type === 'database'`: テーブル一覧からtableNameを選択
- 接続変更時はpath/tableNameをリセット

### 4. Target設定UI拡張（552-579行目）

Source設定と同様のパターンでpath/tableName選択を追加

### 5. Lookup設定UI拡張（1420行目付近）

接続選択の直後にpath/tableName選択を追加

## UI動作仕様

| 接続タイプ | 表示するフィールド | 選択肢のソース |
|-----------|-------------------|---------------|
| file | パス | `hosts.find(h => h.name === connection.host)?.directories` |
| database | テーブル | `tables` (TableDefinition[]) |

- 接続未選択時: パス/テーブル選択は非表示
- 接続変更時: 選択済みのpath/tableNameをクリア（不整合防止）

## 既存パターン参照

- [DataSourceSettings.tsx](src/components/settings/DataSourceSettings.tsx): ディレクトリ選択の実装パターン
- [BiDashboardSettings.tsx](src/components/settings/BiDashboardSettings.tsx): テーブル選択の実装パターン

## 検証手順

1. `npm test` - ユニットテスト実行
2. `npm run build` - TypeScriptエラーチェック
3. `npm run dev` - 開発サーバーで動作確認
   - MappingDesignerを開く
   - Sourceノードを追加し、ファイル接続を選択 → ディレクトリが選択できることを確認
   - Sourceノードを追加し、データベース接続を選択 → テーブルが選択できることを確認
   - Target/Lookupでも同様に確認
