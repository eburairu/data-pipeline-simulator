# 機能仕様書: UIコンポーネント分割

**機能ブランチ**: `012-ui-component-decomposition`
**作成日**: 2026-02-05
**ステータス**: 実装完了 (Implemented)
**入力**: Gemini CLIによるコードベース分析結果

## 背景

コードベース分析により、以下のUIコンポーネントが大きすぎて保守が困難であることが特定された:

1. **MappingDesigner.tsx**: 1300行超、21種類の変換タイプの設定フォームが1ファイルに混在
2. **JobMonitor.tsx**: モーダルとリスト表示が混在
3. **BiDashboard.tsx**: 複数のウィジェットが1ファイルに含まれる
4. **DatabaseSettings.tsx**: テーブルエディタの複雑なUIが分離されていない

## ユーザーシナリオとテスト

### ユーザーストーリー 1 - MappingDesigner分割 (優先度: P1)

開発者として、MappingDesigner.tsxが変換タイプごとに分割されていることで、特定の変換設定UIを容易に見つけて修正できるようにしたい。

**この優先度の理由**: MappingDesignerは最も複雑なコンポーネントであり、分割効果が最も大きい。

**独立テスト**: 各変換タイプの設定UIが独立したコンポーネントとして動作し、MappingDesigner全体が正常に機能する。

**受け入れシナリオ**:

1. **前提条件** 分割後のMappingDesigner, **操作** Source変換を選択, **期待結果** SourceConfigPanel.tsxの設定UIが表示される
2. **前提条件** 分割後のMappingDesigner, **操作** Joiner変換を選択, **期待結果** JoinerConfigPanel.tsxの設定UIが表示される
3. **前提条件** すべての変換タイプ, **操作** 各変換の設定を編集, **期待結果** 従来通り設定が保存される

---

### ユーザーストーリー 2 - JobMonitor分割 (優先度: P2)

開発者として、JobMonitor.tsxからモーダルコンポーネントが分離されていることで、モーダルの修正がリスト表示に影響しないようにしたい。

**この優先度の理由**: 011-performance-optimizationでの最適化と組み合わせることで、コンポーネント構造が明確になる。

**独立テスト**: JobDetailModalが独立したコンポーネントとして動作し、ジョブリストから正しく開閉できる。

**受け入れシナリオ**:

1. **前提条件** ジョブリスト表示中, **操作** ジョブをクリック, **期待結果** JobDetailModalが開く
2. **前提条件** JobDetailModal表示中, **操作** 閉じるボタンをクリック, **期待結果** モーダルが閉じてリストに戻る
3. **前提条件** ジョブ実行中, **操作** モーダルでログを確認, **期待結果** リアルタイムでログが更新される

---

### ユーザーストーリー 3 - BiDashboard分割 (優先度: P2)

開発者として、BiDashboard.tsxから各ウィジェットが分離されていることで、新しいウィジェットの追加が容易になることを期待する。

**この優先度の理由**: 新機能追加の基盤となり、コードの再利用性が向上する。

**独立テスト**: 各ウィジェットコンポーネントが独立して動作し、BiDashboard全体のレイアウトが維持される。

**受け入れシナリオ**:

1. **前提条件** BiDashboard表示中, **操作** ダッシュボードを確認, **期待結果** すべてのウィジェットが正しく表示される
2. **前提条件** 分割後の構造, **操作** 特定のウィジェットのみ修正, **期待結果** 他のウィジェットに影響なし
3. **前提条件** ウィジェットコンポーネント, **操作** 別の場所で再利用, **期待結果** 単独で動作する

---

### ユーザーストーリー 4 - DatabaseSettings分割 (優先度: P3)

開発者として、DatabaseSettings.tsxからTableEditorが分離されていることで、テーブル編集UIの改善が容易になることを期待する。

**この優先度の理由**: 重要だが、他のコンポーネントほど複雑ではない。

**独立テスト**: TableEditorコンポーネントが独立して動作し、DatabaseSettingsから正しく呼び出される。

**受け入れシナリオ**:

1. **前提条件** DatabaseSettings表示中, **操作** テーブルを編集, **期待結果** TableEditorが正しく動作する
2. **前提条件** TableEditorコンポーネント, **操作** カラムを追加, **期待結果** 設定が正しく保存される

---

### エッジケース

- 変換タイプの動的ロード時のパフォーマンス
- モーダル表示中に親コンポーネントが更新された場合
- ウィジェットデータが欠落している場合のフォールバック表示

## 要件

### 機能要件

- **FR-001**: MappingDesignerの各変換タイプ設定は `src/components/settings/mapping/` に個別コンポーネントとして分割されなければならない
- **FR-002**: 各設定パネルコンポーネントは共通の `TransformationConfigProps` インターフェースを実装しなければならない
- **FR-003**: JobMonitor.tsxからモーダル部分は `src/components/modals/JobDetailModal.tsx` に分離されなければならない
- **FR-004**: BiDashboardの各ウィジェットは `src/components/widgets/` に分割されなければならない
- **FR-005**: DatabaseSettings.tsxからテーブルエディタは `src/components/common/TableEditor.tsx` に分離されなければならない
- **FR-006**: 分割後もすべての既存機能が維持されなければならない
- **FR-007**: MappingDesigner.tsxのコード行数が500行以下になること

### 主要エンティティ

- **TransformationConfigProps**: 変換設定パネルの共通プロパティ型（value, onChange, availableFields等）
- **WidgetProps**: ダッシュボードウィジェットの共通プロパティ型
- **TableEditorProps**: テーブルエディタの共通プロパティ型

## 成功基準

### 測定可能なアウトカム

- **SC-001**: MappingDesigner.tsxのコード行数が500行以下になる
- **SC-002**: 変換タイプごとの設定パネルが21ファイル以上に分割される
- **SC-003**: すべての既存テストがパスする
- **SC-004**: npm run build がエラーなく完了する
- **SC-005**: 各分割されたコンポーネントが100-300行以内に収まる

## 技術的考慮事項

### ディレクトリ構造

```
src/components/
├── settings/
│   ├── MappingDesigner.tsx       # オーケストレーター（軽量化）
│   └── mapping/                   # 変換設定パネル
│       ├── index.ts               # 動的インポート/登録
│       ├── SourceConfigPanel.tsx
│       ├── TargetConfigPanel.tsx
│       ├── FilterConfigPanel.tsx
│       ├── JoinerConfigPanel.tsx
│       ├── LookupConfigPanel.tsx
│       └── ...（各変換タイプ）
├── modals/
│   └── JobDetailModal.tsx         # ジョブ詳細モーダル
├── widgets/
│   ├── index.ts
│   ├── RecordCountWidget.tsx
│   ├── ThroughputWidget.tsx
│   ├── ErrorRateWidget.tsx
│   └── ...
└── common/
    ├── TableEditor.tsx            # 汎用テーブルエディタ
    └── ...
```

### 共通インターフェース

```typescript
// TransformationConfigProps
interface TransformationConfigProps {
  config: TransformationConfig;
  onChange: (config: TransformationConfig) => void;
  availableFields: string[];
  availableSources?: string[];
  // 変換タイプ固有の追加プロパティは各コンポーネントで拡張
}

// WidgetProps
interface WidgetProps {
  data: unknown;
  title?: string;
  className?: string;
}
```

### 動的コンポーネント読み込み

```typescript
// mapping/index.ts
const configPanels: Record<TransformationType, React.ComponentType<TransformationConfigProps>> = {
  Source: SourceConfigPanel,
  Target: TargetConfigPanel,
  // ...
};

export function getConfigPanel(type: TransformationType) {
  return configPanels[type];
}
```
