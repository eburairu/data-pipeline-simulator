## ドキュメント同期レポート - 2026-02-17

### 検出された変更
- アーカイブ圧縮/展開機能の実装において、Zip形式のサポートが追加されていることを確認しました。
- `Mapping` の `TargetConfig` インターフェースにおいて、圧縮設定が単一の `compression` ではなく、複数のアクションを指定可能な `compressionActions` 配列として実装されていることを確認しました。

### 更新したドキュメント
- README.md: アーカイブサポート形式に `Zip` を追加しました。
- .specify/specs/015-archive-compression-support/spec.md: `TargetConfig` の定義を `compressionActions` に修正し、UI要件の記述も「複数指定・順序変更可能」に更新しました。

### 注意が必要な項目
- `ArchiveEngine.ts` では `isCompressed` 関数で `GZ`, `ZIP`, `TAR` のヘッダーをチェックしており、圧縮サポートの一貫性を確認しました。

### 推奨事項
- 今後新しい圧縮形式を追加する場合は、`ArchiveEngine.ts` だけでなく、`CompressionFormat` 型定義と `README.md` の両方を更新するようにしてください。
