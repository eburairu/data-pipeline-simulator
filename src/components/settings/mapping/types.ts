/**
 * マッピング設定パネル用の型定義
 */
import type { Mapping, TransformationType } from '../../../lib/MappingTypes';

/**
 * 変換設定パネルの共通プロパティ
 */
export interface TransformationConfigProps<T extends TransformationType = TransformationType> {
  /** 変換ID */
  transformationId: string;
  /** 変換タイプ */
  type: T;
  /** 現在の設定値 */
  config: Record<string, unknown>;
  /** 設定値変更時のコールバック */
  onChange: (config: Record<string, unknown>) => void;
  /** マッピング全体の設定（参照用） */
  mapping: Mapping;
  /** 読み取り専用モード */
  readOnly?: boolean;
}

/**
 * 設定パネル登録用の型
 */
export interface ConfigPanelRegistration {
  /** 変換タイプ */
  type: TransformationType;
  /** パネルコンポーネント */
  component: React.ComponentType<TransformationConfigProps>;
  /** 表示名（日本語） */
  displayName: string;
  /** アイコン名 */
  icon?: string;
}

/**
 * 設定パネルの検証結果
 */
export interface ConfigValidationResult {
  /** 検証が成功したか */
  isValid: boolean;
  /** エラーメッセージ（検証失敗時） */
  errors: string[];
  /** 警告メッセージ */
  warnings: string[];
}
