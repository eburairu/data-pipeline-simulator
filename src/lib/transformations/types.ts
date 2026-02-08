/**
 * Transformation Strategy パターンのための型定義
 * 
 * このファイルは、変換処理をStrategy パターンで分離するための
 * 基本インターフェースと型を定義します。
 */

import type {
    Transformation,
    Mapping,
    MappingTask,
} from '../MappingTypes';
import type {
    DataRow,
    DataValue,
    ConnectionDefinition,
    TableDefinition,
    TopicDefinition,
} from '../types';

/**
 * 変換実行に必要なコンテキスト情報
 */
export interface TransformationContext {
    /** 入力データバッチ */
    batch: DataRow[];
    /** パラメータ（変数置換用） */
    parameters: Record<string, string>;
    /** マッピング定義全体（Joiner/Union用） */
    mapping: Mapping;
    /** 実行統計 */
    stats: ExecutionStats;
    /** タスク設定 */
    task: MappingTask;
    /** コネクション定義 */
    connections: ConnectionDefinition[];
    /** テーブル定義 */
    tables: TableDefinition[];
    /** トピック定義 */
    topics: TopicDefinition[];
    /** ファイルシステム操作 */
    fs: FileSystemOps;
    /** データベース操作 */
    db: DbOps;
    /** 実行状態（シーケンス番号など） */
    state: ExecutionState;
}

/**
 * 変換実行結果
 */
export interface TransformationResult {
    /** 出力データバッチ */
    output: DataRow[];
    /** 処理を継続するかどうか */
    continue: boolean;
    /** ルーター用: グループ別の出力 */
    routerOutput?: Record<string, DataRow[]>;
    /** エラーメッセージ */
    error?: string;
}

/**
 * 設定検証結果
 */
export interface ValidationResult {
    /** 検証が成功したか */
    valid: boolean;
    /** エラーメッセージのリスト */
    errors: string[];
    /** 警告メッセージのリスト */
    warnings: string[];
}

/**
 * 変換Strategyのインターフェース
 * すべての変換タイプはこのインターフェースを実装する必要があります。
 */
export interface TransformationStrategy<T extends Transformation = Transformation> {
    /** 変換タイプ名 */
    readonly type: T['type'];

    /**
     * 変換を実行します
     * @param node 変換ノードの設定
     * @param context 実行コンテキスト
     * @returns 変換結果
     */
    execute(node: T, context: TransformationContext): Promise<TransformationResult>;

    /**
     * 設定を検証します
     * @param node 変換ノードの設定
     * @returns 検証結果
     */
    validate(node: T): ValidationResult;
}

/**
 * 実行統計
 */
export interface ExecutionStats {
    transformations: {
        [transformationId: string]: {
            name: string;
            input: number;
            output: number;
            errors: number;
            rejects: number;
        };
    };
    links?: { [linkId: string]: number };
    rejectRows?: { row: DataRow; error: string; transformationName: string }[];
    cache?: { [key: string]: unknown };
}

/**
 * 実行状態
 */
export interface ExecutionState {
    processedFiles?: Set<string>;
    lastProcessedTimestamp?: number;
    sequences?: Record<string, number>;
}

/**
 * ファイルシステム操作のインターフェース
 */
export interface FileSystemOps {
    listFiles: (host: string, path: string) => { name: string; content: string }[];
    readFile: (host: string, path: string, filename: string) => string;
    deleteFile: (host: string, filename: string, path: string) => void;
    writeFile: (host: string, path: string, filename: string, content: string) => void;
}

/**
 * データベース操作のインターフェース
 */
export interface DbOps {
    select: (tableName: string) => (DbRecord | DataRow)[];
    insert: (tableName: string, record: DataRow) => void;
    update: (tableName: string, id: string, record: DataRow) => void;
    delete: (tableName: string, id: string) => void;
}

/**
 * データベースレコード
 */
export interface DbRecord {
    id: string;
    data: DataRow;
}

/**
 * 式を評価するヘルパー関数の型
 */
export type ExpressionEvaluator = (
    record: DataRow,
    expression: string,
    parameters?: Record<string, string>
) => DataValue;
