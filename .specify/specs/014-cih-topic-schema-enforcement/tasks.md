# Tasks: 014-cih-topic-schema-enforcement

## Phase 1: データモデルの拡張
- [x] `src/lib/types.ts` の `TopicDefinition` に `schema` と `schemaEnforcement` フィールドを追加
- [x] `src/lib/MappingTypes.ts` の `TargetConfig` に `targetType` と `topicId` フィールドを追加

## Phase 2: MappingEngine の拡張
- [x] `processTarget` 関数を更新し、ターゲットがTopicの場合のロジックを実装
- [x] `traverseAsync` と `executeMappingTaskRecursive` に `topics` 引数を追加して伝播
- [x] Schema Enforcement の Strict モード（厳格な検証）の実装
- [x] Schema Enforcement の Lenient モード（寛容な検証・型キャスト）の実装

## Phase 3: Topicへの書き込み実装
- [x] 検証済みデータを `/topics/{topicId}/` 配下にJSON形式で書き出すロジックの実装

## Phase 4: 検証
- [x] `src/lib/MappingEngine_Topic.test.ts` による単体テストの作成と実行
- [x] Strict/Lenient 各モードの動作確認
