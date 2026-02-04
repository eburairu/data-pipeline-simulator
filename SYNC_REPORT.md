## ドキュメント同期レポート - 2026-05-21

### 検出された変更
- Task Flow可視化機能の強化（`PipelineFlow.tsx`）
  - Task Flow内のタスク間依存関係の可視化
  - Task FlowおよびMapping Taskに関連するデータソース（DBテーブル含む）の自動ノード作成と接続関係の可視化

### 更新したドキュメント
- README.md: 「可視化とモニタリング」セクションに `Pipeline Flow` の詳細を追加し、依存関係の可視化について明記しました。
- .specify/specs/003-dataintegration-features/spec.md: `FR-V01` の要件に、Task Flowの依存関係およびデータソース接続の可視化に関する詳細を追加しました。

### 注意が必要な項目
- 特になし。

### 推奨事項
- Task Flow Designer自体のUI操作に関するヘルプやツールチップが充実すると、よりユーザーフレンドリーになると思われます。
