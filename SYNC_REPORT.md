## ドキュメント同期レポート - 2026-05-22

### 検出された変更

本日のコードベース分析により、以下の新機能および仕様変更が検出されましたが、ドキュメントに反映されていませんでした。

1.  **Task Flow (タスクフロー) 機能**:
    *   複数のMapping Taskを依存関係のあるフローとして定義・実行する機能 (`TaskFlowDesigner.tsx`, `TaskFlowSettings.tsx`)。
    *   Mapping Task間の並列実行や順次実行制御の実装。

2.  **Infrastructure Settings (インフラ設定)**:
    *   Data Sourceの設定画面において、物理ホストやディレクトリ構成を管理する機能 (`InfrastructureSettings.tsx`)。

3.  **拡張されたTransformationライブラリ**:
    *   `MappingEngine.ts` に実装されているTransformationの種類が、従来の5種類から大幅に増加していました。
    *   追加機能: Joiner, Lookup, Router, Sorter, Union, Normalizer, Rank, Sequence, UpdateStrategy, Cleansing, Deduplicator, Pivot, Unpivot, SQL, WebService, HierarchyParser。

4.  **システムリファクタリング**:
    *   システム全体のリファクタリング（型安全性向上、フック抽出など）に関する仕様書 (`005-system-refactoring/spec.md`) が追加されていましたが、READMEからの導線がありませんでした。

### 更新したドキュメント

*   **README.md**:
    *   「主な機能」セクションに `Task Flow Designer` を追加しました。
    *   「設定」セクションに `Infrastructure Settings` と `Template Manager` の言及を追加しました。
    *   「Data Integration」セクションのETL機能リストを、実装に合わせて完全に更新しました。
    *   「詳細仕様」セクションに `システムリファクタリング仕様` へのリンクを追加しました。

*   **.specify/specs/003-dataintegration-features/spec.md**:
    *   機能要件 (Requirements) を更新し、サポートされる全Transformationタイプをリストアップしました。
    *   `Task Flow` に関する機能要件 (`FR-T04`) と可視化要件 (`FR-V03`) を追加しました。
    *   Statusを `Implemented` に更新しました。

### 注意が必要な項目

*   **.specify/specs/004-etl-enhancements/spec.md**:
    *   この仕様書は「Expression Functions」と「Bad File」に特化しており、今回の更新範囲外としていますが、他のETL機能（Transformation）の詳細は `003-dataintegration-features/spec.md` に集約しました。将来的に仕様書の構成を見直す必要があるかもしれません。
*   **Template Manager**:
    *   `src/components/settings/TemplateManager.tsx` が存在しますが、詳細仕様書には明示的な言及が少ないため、READMEでの言及に留めました。

### 推奨事項

*   実装と仕様書の乖離を防ぐため、新機能（特に新しいTransformationタイプなど）を追加する際は、必ず仕様書 (`spec.md`) を更新するプロセスを徹底することを推奨します。
*   Task Flow機能の詳細仕様書を、独立したドキュメントとして作成することを検討してください。
