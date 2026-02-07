## ドキュメント同期レポート - 2026-02-07

### 検出された変更
- **新規仕様書の追加**: `014` (CIH Schema Enforcement), `015` (Archive Compression), `016` (Simulation Tab Integration) の仕様書が追加されました。
- **アーカイブ・圧縮エンジンの実装**: `src/lib/ArchiveEngine.ts` が追加され、Gzip/Tarの圧縮・展開機能が導入されました。
- **シミュレーションタブのUI変更**: BIダッシュボードがシミュレーションタブから分離され、独立したタブとして機能するようになりました。
- **トピックのスキーマ強制**: `MappingEngine` にTopicのスキーマ検証ロジックが実装されました。

### 更新したドキュメント
- **README.md**:
    - 新規仕様書へのリンクを追加しました。
    - 「アーカイブ・圧縮サポート」を機能一覧に追加しました。
    - シミュレーションタブの説明を現状に合わせて修正しました。
- **.specify/specs/015-archive-compression-support/spec.md**:
    - ステータスヘッダー (`Status: Implemented`) を追加しました。

### 注意が必要な項目
- **ArchiveEngineの実装状態**: `src/lib/ArchiveEngine.ts` の `decompressRecursive` 関数内にコメントアウトされたコードや未整理のロジックが見受けられます。機能としては動作している可能性がありますが、リファクタリングやクリーンアップが必要かもしれません。
- **仕様書016のタイトル**: ファイル名 `016-simulation-tab-integration` に対し、仕様書内のタイトルは `016-simulation-bi-removal` となっています。内容は一致していますが、表記揺れに注意してください。

### 推奨事項
- `ArchiveEngine.ts` のコードレビューとテスト拡充を推奨します。
