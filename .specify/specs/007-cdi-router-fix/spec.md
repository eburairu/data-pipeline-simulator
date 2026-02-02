# 仕様書 007: CDI Router 変換の修正

## 背景
`MappingEngine` 内の `Router` 変換の現在の実装が不完全です。ルーティングされた行を計算しますが、`defaultGroup` の行のみをダウンストリームの変換に渡しています。実際のData Integration環境（Informatica CDI など）では、Router 変換は条件に基づいてデータの異なるサブセットを異なるダウンストリームブランチに送ることができます。

## 要件

### 1. データモデルの更新
- `MappingTypes.ts` の `MappingLink` インターフェースにオプションの `routerGroup` プロパティを追加。
  - これにより、リンクが Router のどの出力グループに接続されているかを指定できます。

### 2. マッピングエンジンの更新
- `MappingEngine.ts` の `traverseAsync` を以下のように修正：
  - 現在のノードが `Router` かどうかを識別。
  - 送信リンクを反復する際に、リンクの `routerGroup` プロパティを確認。
  - Router の処理結果から対応するデータサブセット（バッチ）を取得。
  - 正しいサブセットを次のノードに渡す。

### 3. 検証
- 以下を検証するユニットテスト `MappingEngine_Router.test.ts` を作成：
  - データが正しく複数のグループに分割されること。
  - ダウンストリームノードがリンク構成に基づいて正しいデータサブセットを受け取ること。
  - デフォルトグループがどの条件にもマッチしない行を受け取ること。

## ユーザーインターフェースへの影響
- このタスクでは直接的なUI変更はなし（UIエディタは別途更新されるか、現時点では手動で設定することを想定）。焦点はエンジンの機能にあります。

## 技術詳細

### MappingLink インターフェース
```typescript
export interface MappingLink {
  id: string;
  sourceId: string;
  targetId: string;
  routerGroup?: string; // 新しいオプションプロパティ
}
```

### エンジンロジック
現在のロジック：
```typescript
const routed = processRouter(nextNode, batch, parameters);
processedBatch = routed[nextNode.config.defaultGroup || 'default'];
```

新しいロジック（概念）：
```typescript
// traverseAsync の outgoingLinks ループ内
if (currentNode.type === 'router') {
    // 前のノードが router だった場合、この関数に渡される 'batch' は
    // ここに到達したリンクに固有のものである必要があります。
    // ただし、traverseAsync は現在のノードを処理した *後* に呼び出されます。
    // したがって、traverseAsync がどのように再帰的に呼び出すかを確認する必要があります。
}
```

修正：`traverseAsync` は `currentNode` を処理し、次に `outgoingLinks` を反復します。
Router ノードの場合：
1. `processRouter` を実行 -> `Record<string, DataRow[]>` を返す。
2. `outgoingLinks` を反復。
3. 各リンクについて、それがどのグループに属するかを決定（`link.routerGroup`）。
4. `processRouter` の結果から特定のバッチを選択。
5. その特定のバッチで `nextNode` に対して `traverseAsync` を呼び出す。

非 Router ノードの場合、動作は変更なし（単一の `processedBatch` を渡す）。
