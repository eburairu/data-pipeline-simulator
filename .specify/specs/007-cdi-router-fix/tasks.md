---
description: "CDI Router 変換修正のためのタスク"
---

# タスク: 007-cdi-router-fix

**入力**: コードベース分析と `spec.md`
**前提条件**: なし

## フェーズ 1: データモデル

- [x] T001 [Type] `src/lib/MappingTypes.ts` の `MappingLink` インターフェースに `routerGroup?: string` プロパティを追加。

## フェーズ 2: エンジンロジック

- [x] T002 [Core] `src/lib/MappingEngine.ts` の `traverseAsync` を修正し、Router ノードを検出して `link.routerGroup` に基づいて正しいバッチを選択。
- [x] T003 [Core] `routerGroup` が指定されていない場合のデフォルト動作が `defaultGroup` にフォールバックすることを確認。

## フェーズ 3: 検証

- [x] T004 [Test] `src/lib/MappingEngine_Router.test.ts` に包括的な Router テストを作成。
- [x] T005 [Test] データが GroupA、GroupB、Default グループに正しく分割されることを検証。
- [x] T006 [Test] `npm test -- --run MappingEngine_Router` を実行してすべてのテストが合格することを確認。
