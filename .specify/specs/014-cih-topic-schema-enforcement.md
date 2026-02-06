# CIH Topic Schema Enforcement

## Status
- **ID**: 014
- **Status**: Implemented
- **Author**: Jules
- **Date**: 2024-05-22

## 概要
Data Hub (CIH) のTopic機能において、データの信頼性を担保するためにスキーマ定義とSchema Enforcement（スキーマ強制）機能を実装する。
これにより、不正なデータがTopicに混入するのを防ぎ、下流のサブスクライバーが予期しないデータ形式によりエラーを起こすリスクを低減する。

## 目標
1. `TopicDefinition` にスキーマ情報を追加する。
2. マッピングエンジンのターゲット処理において、ターゲットがTopicの場合にスキーマ検証を行う。
3. `Strict`（厳格）および `Lenient`（寛容）な検証モードをサポートする。

## 技術仕様

### 1. データモデルの拡張

#### TopicDefinition (`src/lib/types.ts`)
```typescript
export interface TopicDefinition {
  id: string;
  name: string;
  retentionPeriod: number;
  // 新規追加
  schema?: FieldDefinition[];
  schemaEnforcement?: 'strict' | 'lenient';
}
```

#### TargetConfig (`src/lib/MappingTypes.ts`)
```typescript
export interface TargetConfig {
  connectionId?: string; // Optional化 (Topic時は不要なため)
  targetType?: 'connection' | 'topic'; // 新規追加
  topicId?: string; // 新規追加
  // ... existing fields
}
```

### 2. MappingEngine の拡張

`processTarget` 関数およびそれを呼び出す `traverseAsync`, `executeMappingTaskRecursive` を更新し、`topics: TopicDefinition[]` を引数として受け取るようにする。

#### 検証ロジック

**Schema Enforcement: Strict**
- **フィールドの存在**: スキーマに定義されたフィールドが入力レコードに存在し、null/undefinedでないこと。
- **型の一致**: 値の型がスキーマ定義と一致すること（例: number型フィールドに文字列が入っていないか）。
- **未知のフィールド**: スキーマに定義されていないフィールドが入力に含まれている場合、エラーとする（または削除して通すオプションも考えられるが、今回はエラーとする）。

**Schema Enforcement: Lenient**
- **型変換**: 型が一致しない場合、キャストを試みる（例: 文字列 "123" -> 数値 123）。キャストできない場合はnullとするか、デフォルト値を使用。
- **欠損フィールド**: 定義されたフィールドがない場合、nullとして扱う。
- **未知のフィールド**: 無視する（エラーにしない）。

### 3. Topicへの書き込み
- 検証に合格したレコードのみをTopicの保存先（ファイルシステム上の所定パス）に書き込む。
- パス形式: `/topics/{topicId}/{timestamp}_{batchId}.json`
- フォーマット: JSON Array

## 検証計画
- 単体テスト `src/lib/MappingEngine_Topic.test.ts` を作成。
- Strictモードで不正なデータを渡してエラーになることを確認。
- Lenientモードで型変換が行われることを確認。
- 正常系でファイルが生成されることを確認。
