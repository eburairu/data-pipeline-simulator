# マッピングデザイナー設定パネル修正計画

## 問題の概要

マッピングデザイナーのトランスフォーメーション設定パネルが正しく機能していません。

- トランスフォーメーションの配置は可能
- しかし、ほとんどのトランスフォーメーションタイプの設定UIが欠落している
- 現在、`source`と`filter`のみ設定可能

## 原因

[MappingDesigner.tsx:439-527](src/components/settings/MappingDesigner.tsx#L439-L527)の`renderConfigPanel()`関数で、21種類のトランスフォーメーションタイプのうち、2種類（`source`と`filter`）のみしか設定フォームが実装されていない。

## 修正方針

`renderConfigPanel()`関数内に、欠落している19種類のトランスフォーメーションタイプの設定フォームを追加します。各トランスフォーメーションの設定構造は[MappingTypes.ts](src/lib/MappingTypes.ts)で定義されています。

## 実装する必要がある設定フォーム

以下のトランスフォーメーションタイプの設定UIを追加：

1. **target** - 配信先接続の選択
2. **expression** - フィールド式設定
3. **aggregator** - グループ化と集計フィールド
4. **validator** - 検証ルールとエラー動作
5. **joiner** - 結合タイプとキー設定
6. **lookup** - ルックアップテーブルと参照設定
7. **router** - ルーティングルール設定
8. **sorter** - ソートフィールド設定
9. **union** - （設定なし - メッセージ表示のみ）
10. **normalizer** - 配列フィールドと出力設定
11. **rank** - パーティション、順序、ランクタイプ
12. **sequence** - シーケンス設定
13. **updateStrategy** - 更新戦略設定
14. **cleansing** - クレンジングルール
15. **deduplicator** - 重複除去キー
16. **pivot** - ピボット設定
17. **unpivot** - アンピボット設定
18. **sql** - SQLクエリ設定
19. **webService** - Web APIエンドポイント設定
20. **hierarchyParser** - 階層パース設定

## 修正ファイル

- [src/components/settings/MappingDesigner.tsx](src/components/settings/MappingDesigner.tsx)

## 実装アプローチ

### 1. 既存パターンの再利用
- `source`と`filter`の実装パターンを参考にする
- `readOnly`プロパティの適切な適用
- `updateTransformationConfig()`を使用した設定更新

### 2. 各トランスフォーメーションタイプの設定UI

#### 基本パターン
```tsx
{node.type === 'typename' && (
  <div className="space-y-3">
    {/* 各設定フィールド */}
  </div>
)}
```

#### フィールドタイプ
- **テキスト入力**: 単純な値（URL、フィールド名等）
- **セレクト**: 接続、列挙値の選択
- **チェックボックス**: ブール値
- **配列入力**: キー、フィールドリスト（動的追加/削除）
- **複雑なオブジェクト配列**: ルール、条件、マッピング等

### 3. 型定義の参照

設定の型は[MappingTypes.ts](src/lib/MappingTypes.ts)に定義されているので、各トランスフォーメーションの`config`型を参照して正確なフィールドを実装する。

### 4. UXの考慮事項

- すべての入力フィールドに適切なラベルとプレースホルダー
- `readOnly`モードでは編集不可
- 配列フィールドには追加/削除ボタン
- バリデーションエラーの表示（必要に応じて）

## 実装の詳細

### 各トランスフォーメーションタイプの実装優先度

#### 優先度1: 基本的な設定（単純フィールド）
1. **target** - 接続選択、truncateチェックボックス
2. **union** - 設定なし（メッセージのみ表示）
3. **sequence** - 3つのテキスト/数値入力
4. **deduplicator** - キー配列、チェックボックス

#### 優先度2: 中程度の複雑さ（配列フィールドあり）
5. **expression** - フィールド式の配列
6. **aggregator** - グループ化と集計フィールドの配列
7. **sorter** - ソートフィールドの配列
8. **normalizer** - 配列フィールド、出力フィールド
9. **cleansing** - クレンジングルールの配列
10. **pivot/unpivot** - グループ化とフィールド設定

#### 優先度3: 高度な設定（複雑な構造）
11. **validator** - バリデーションルールの配列
12. **joiner** - 結合タイプとキー配列
13. **lookup** - 接続、複数のキー配列
14. **router** - ルート配列とデフォルトグループ
15. **rank** - パーティション、順序配列、ランクタイプ
16. **updateStrategy** - 戦略フィールドと条件配列
17. **sql** - SQLクエリとモード選択
18. **webService** - URL、メソッド、ヘッダー配列、レスポンスマップ
19. **hierarchyParser** - 入力フィールドと出力フィールド配列

### UIパターン

#### 1. 単純な入力フィールド
```tsx
<input
  disabled={readOnly}
  className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
  value={config.field}
  onChange={e => updateTransformationConfig(node.id, { field: e.target.value })}
  placeholder="例: value"
/>
```

#### 2. セレクトボックス
```tsx
<select
  disabled={readOnly}
  className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
  value={config.type}
  onChange={e => updateTransformationConfig(node.id, { type: e.target.value })}
>
  <option value="option1">Option 1</option>
  <option value="option2">Option 2</option>
</select>
```

#### 3. チェックボックス
```tsx
<label className="flex items-center gap-2 cursor-pointer">
  <input
    type="checkbox"
    disabled={readOnly}
    checked={config.enabled}
    onChange={e => updateTransformationConfig(node.id, { enabled: e.target.checked })}
    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
  />
  <span className="text-xs text-gray-700">有効化</span>
</label>
```

#### 4. 配列フィールド（動的追加/削除）
```tsx
{config.items.map((item, idx) => (
  <div key={idx} className="flex gap-2 items-center">
    <input
      disabled={readOnly}
      className="flex-1 border rounded p-1 text-sm disabled:bg-gray-100"
      value={item}
      onChange={e => {
        const newItems = [...config.items];
        newItems[idx] = e.target.value;
        updateTransformationConfig(node.id, { items: newItems });
      }}
    />
    {!readOnly && (
      <button
        onClick={() => {
          const newItems = config.items.filter((_, i) => i !== idx);
          updateTransformationConfig(node.id, { items: newItems });
        }}
        className="text-red-500 hover:text-red-700"
      >
        <Trash2 size={14} />
      </button>
    )}
  </div>
))}
{!readOnly && (
  <button
    onClick={() => {
      updateTransformationConfig(node.id, { items: [...config.items, ''] });
    }}
    className="text-blue-600 text-xs hover:underline flex items-center gap-1"
  >
    <Plus size={12} /> 追加
  </button>
)}
```

#### 5. オブジェクト配列（複雑な構造）
```tsx
{config.rules.map((rule, idx) => (
  <div key={idx} className="border p-2 rounded bg-gray-50 space-y-2">
    <div className="flex justify-between items-center">
      <span className="text-xs font-medium">ルール {idx + 1}</span>
      {!readOnly && (
        <button
          onClick={() => {
            const newRules = config.rules.filter((_, i) => i !== idx);
            updateTransformationConfig(node.id, { rules: newRules });
          }}
          className="text-red-500 hover:text-red-700"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
    {/* 各ルールのフィールド */}
    <input
      disabled={readOnly}
      className="w-full border rounded p-1 text-sm disabled:bg-gray-100"
      placeholder="フィールド名"
      value={rule.field}
      onChange={e => {
        const newRules = [...config.rules];
        newRules[idx] = { ...rule, field: e.target.value };
        updateTransformationConfig(node.id, { rules: newRules });
      }}
    />
  </div>
))}
```

## 検証方法

### 1. 開発サーバーで確認
```bash
npm run dev
```

### 2. テストシナリオ
1. 各トランスフォーメーションタイプを追加
2. 設定パネルが正しく表示されることを確認
3. 各フィールドの入力・変更が可能であることを確認
4. 保存後、設定が正しく保持されることを確認
5. `readOnly`モードで編集不可であることを確認
6. 配列フィールドの追加・削除が正しく機能することを確認

### 3. ビルドテスト
```bash
npm test && npm run build
```

### 4. 特定のトランスフォーメーションの機能テスト
- **Expression**: フィールド式を追加し、データ変換が正しく動作するか
- **Aggregator**: グループ化と集計が正しく動作するか
- **Joiner**: 複数のソースの結合が正しく動作するか
- **Router**: 条件による分岐が正しく動作するか

## 実装手順

### 1. `renderConfigPanel()`関数の拡張

[MappingDesigner.tsx:439-527](src/components/settings/MappingDesigner.tsx#L439-L527)の`renderConfigPanel()`関数で、既存の`source`と`filter`の実装の後に、残りの19種類のトランスフォーメーションタイプの設定フォームを追加します。

### 2. 型アサーションの適用

各トランスフォーメーションタイプの`config`にアクセスする際は、適切な型アサーション（例：`node.config as TargetConfig`）を使用します。

### 3. 配列フィールドの実装

配列フィールド（例：`expression.fields`, `aggregator.groupBy`）は、`.map()`でレンダリングし、追加・削除ボタンを提供します。

### 4. 接続選択の実装

`target`, `lookup`, `sql`などの接続を必要とするトランスフォーメーションには、`connections`配列からセレクトボックスを生成します。

## 実装の優先順位

実装は3つのフェーズに分けて行います：

1. **Phase 1: 単純なフィールド** (target, union, sequence, deduplicator)
2. **Phase 2: 配列フィールド** (expression, aggregator, sorter, normalizer, cleansing, pivot, unpivot)
3. **Phase 3: 複雑な構造** (validator, joiner, lookup, router, rank, updateStrategy, sql, webService, hierarchyParser)

## 重要ファイル

- **修正対象**: [src/components/settings/MappingDesigner.tsx](src/components/settings/MappingDesigner.tsx)
- **型定義参照**: [src/lib/MappingTypes.ts](src/lib/MappingTypes.ts)
- **動作確認**: MappingEngineで実際のデータ変換が正しく動作することを確認

## 注意事項

- すべてのコメントは日本語で記述
- TypeScriptの型安全性を維持（型アサーションを適切に使用）
- 既存のUIパターンとの一貫性を保つ
- `readOnly`プロパティを全ての入力に適用
- 配列の更新時は必ず新しい配列を作成（イミュータブル）
- オプショナルフィールドには`|| ''`などのデフォルト値を設定
- 各入力フィールドには適切な日本語ラベルとプレースホルダーを追加
