export type Language = 'en' | 'ja';

export const translations = {
  en: {
    app: {
      title: 'Data Pipeline Simulator',
      tabs: {
        simulation: 'Simulation',
        dashboard: 'Dashboard',
        monitor: 'Monitor',
        settings: 'Settings',
        docs: 'Docs'
      },
      control: {
        title: 'Simulation Control',
        all: 'All',
        gen: 'Gen',
        trans: 'Trans',
        map: 'Map',
        createFile: 'Create File'
      },
      storage: {
        source: 'Source Storages',
        intermediate: 'Intermediate',
        internal: 'Internal Storages',
        database: 'Database'
      }
    },
    settings: {
      title: 'Pipeline Configuration',
      tabs: {
        datasource: 'Data Source',
        transfer: 'Transfer',
        processing: 'Processing',
        database: 'Database',
        bi: 'BI Dashboard'
      }
    },
    docs: {
      title: 'Documentation',
      nav: {
        overview: 'Overview',
        settings: 'Settings Guide',
        generators: 'Data Generators',
        functions: 'Functions & Vars'
      },
      overview: {
        title: 'Simulator Overview',
        text: 'This Data Pipeline Simulator allows you to model, execute, and visualize a complete ETL (Extract, Transform, Load) workflow. It simulates the lifecycle of data from generation to final storage, allowing you to test mapping logic, understand data flow, and monitor job execution.',
        step1: { title: '1. Generate', text: 'Create synthetic data using customizable schemas and templates. Simulates external systems sending files.' },
        step2: { title: '2. Transport', text: 'Move data through "Collection" and "Delivery" jobs, simulating file transfers, bandwidth, and latency.' },
        step3: { title: '3. Process', text: 'Transform data using visual Mappings (Join, Aggregate, Filter, etc.) and load into Virtual Tables.' }
      },
      settingsGuide: {
        title: 'Settings Guide',
        datasource: {
            title: 'Data Source (Generation)',
            desc: 'Configures how source files are created.',
            items: [
                'Template Mode: Define raw CSV content with placeholders like ${timestamp}.',
                'Schema Mode: Define columns and their generators (Random, Sequence, etc.) to build CSVs dynamically.',
                'Execution Interval: How often a new file is generated.'
            ]
        },
        collection: {
            title: 'Collection (Ingestion)',
            desc: 'Simulates picking up files from a source host and moving them to an intermediate "Incoming" area.',
            items: [
                'Source/Target: Where files come from and go to.',
                'Bandwidth: Simulates transfer speed (chars/sec).',
                'Rename Pattern: Rename files during transfer (e.g., add timestamp).'
            ]
        },
        delivery: {
            title: 'Delivery (Distribution)',
            desc: 'Moves files from the "Incoming" area to "Internal" storage for processing, or distributes them to target hosts.'
        },
        database: {
            title: 'Database (Virtual)',
            desc: 'Defines the schema of the Virtual Database tables.',
            items: [
                'Tables: Define table names and columns.',
                'These tables are the targets for Target Transformations in Mappings.',
                'Data is stored in-memory within the browser.'
            ]
        }
      },
      generators: {
        title: 'Data Generator Reference',
        desc: 'These generators are used in Data Source > Schema Mode to populate column values.',
        headers: { type: 'Type', params: 'Parameters', desc: 'Description' },
        items: {
          static: { desc: 'Returns a constant value. Supports variables like ${timestamp}.' },
          randomInt: { desc: 'Generates a random integer between min and max (inclusive).' },
          randomFloat: { desc: 'Generates a random float number with specified precision.' },
          sequence: { desc: 'Generates an incrementing number. Persists state between file generations.' },
          uuid: { desc: 'Generates a standard UUID (v4).' },
          list: { desc: 'Randomly selects a value from a comma-separated list (e.g., "A, B, C").' },
          timestamp: { desc: 'Returns the current ISO timestamp.' },
          sin: { desc: 'Generates a wave value based on current time. Useful for simulating sensor data.' }
        }
      },
      functions: {
        title: 'Functions & Variables',
        systemVars: {
            title: 'System Variables',
            desc: 'Available in Expressions and Filters.'
        },
        expressionFuncs: {
            title: 'Expression Functions',
            desc: 'Use these functions in Expression, Filter, and Aggregator transformations.',
            string: { title: 'String Functions' },
            logic: { title: 'Logic & Nulls' },
            math: { title: 'Math & Number' },
            date: { title: 'Date & Other' }
        }
      }
    }
  },
  ja: {
    app: {
      title: 'データパイプライン シミュレータ',
      tabs: {
        simulation: 'シミュレーション',
        dashboard: 'ダッシュボード',
        monitor: 'モニタ',
        settings: '設定',
        docs: 'ドキュメント'
      },
      control: {
        title: 'シミュレーション制御',
        all: '一括',
        gen: '生成',
        trans: '転送',
        map: '処理',
        createFile: 'ファイル作成'
      },
      storage: {
        source: 'ソースストレージ',
        intermediate: '中間ストレージ',
        internal: '内部ストレージ',
        database: 'データベース'
      }
    },
    settings: {
      title: 'パイプライン設定',
      tabs: {
        datasource: 'データソース',
        transfer: '集配信',
        processing: '加工処理',
        database: 'データベース',
        bi: 'BIダッシュボード'
      }
    },
    docs: {
      title: 'ドキュメント',
      nav: {
        overview: '概要',
        settings: '設定ガイド',
        generators: 'データ生成',
        functions: '関数と変数'
      },
      overview: {
        title: 'シミュレータの概要',
        text: 'このデータパイプラインシミュレータを使用すると、ETL（抽出、変換、格納）ワークフロー全体をモデル化、実行、および視覚化できます。データの生成から最終的な保存までのライフサイクルをシミュレートし、マッピングロジックのテスト、データフローの理解、ジョブ実行の監視を行うことができます。',
        step1: { title: '1. 生成 (Generate)', text: 'カスタマイズ可能なスキーマとテンプレートを使用して合成データを作成します。ファイルを送信する外部システムをシミュレートします。' },
        step2: { title: '2. 転送 (Transport)', text: '"収集(Collection)"および"配信(Delivery)"ジョブを通じてデータを移動し、ファイル転送、帯域幅、およびレイテンシをシミュレートします。' },
        step3: { title: '3. 処理 (Process)', text: '視覚的なマッピング（結合、集計、フィルタなど）を使用してデータを変換し、仮想テーブルにロードします。' }
      },
      settingsGuide: {
        title: '設定ガイド',
        datasource: {
            title: 'データソース (生成)',
            desc: 'ソースファイルの作成方法を設定します。',
            items: [
                'テンプレートモード: ${timestamp}のようなプレースホルダーを使用して生のCSVコンテンツを定義します。',
                'スキーマモード: 列とそのジェネレータ（ランダム、シーケンスなど）を定義して、動的にCSVを構築します。',
                '実行間隔: 新しいファイルが生成される頻度です。'
            ]
        },
        collection: {
            title: '収集 (Ingestion)',
            desc: 'ソースホストからファイルを取得し、中間の「Incoming」領域に移動することをシミュレートします。',
            items: [
                'ソース/ターゲット: ファイルの移動元と移動先。',
                '帯域幅: 転送速度（文字数/秒）をシミュレートします。',
                'リネームパターン: 転送中にファイル名を変更します（例：タイムスタンプの追加）。'
            ]
        },
        delivery: {
            title: '配信 (Distribution)',
            desc: '「Incoming」領域から処理用の「Internal」ストレージにファイルを移動するか、ターゲットホストに配布します。'
        },
        database: {
            title: 'データベース (仮想)',
            desc: '仮想データベーステーブルのスキーマを定義します。',
            items: [
                'テーブル: テーブル名と列を定義します。',
                'これらのテーブルは、マッピング内のターゲット変換の出力先となります。',
                'データはブラウザ内のメモリに保存されます。'
            ]
        }
      },
      generators: {
        title: 'データジェネレータ リファレンス',
        desc: 'これらのジェネレータは、データソース > スキーマモードで列の値を入力するために使用されます。',
        headers: { type: 'タイプ', params: 'パラメータ', desc: '説明' },
        items: {
          static: { desc: '定数値を返します。${timestamp}のような変数をサポートします。' },
          randomInt: { desc: '最小値と最大値（含む）の間でランダムな整数を生成します。' },
          randomFloat: { desc: '指定された精度のランダムな浮動小数点数を生成します。' },
          sequence: { desc: '増加する数値を生成します。ファイルの生成間で状態を保持します。' },
          uuid: { desc: '標準のUUID (v4) を生成します。' },
          list: { desc: 'カンマ区切りのリスト（例："A, B, C"）から値をランダムに選択します。' },
          timestamp: { desc: '現在のISOタイムスタンプを返します。' },
          sin: { desc: '現在の時間に基づいて波形の値を生成します。センサーデータのシミュレーションに便利です。' }
        }
      },
      functions: {
        title: '関数と変数',
        systemVars: {
            title: 'システム変数',
            desc: '式やフィルタで使用可能です。'
        },
        expressionFuncs: {
            title: '式関数',
            desc: '式 (Expression)、フィルタ (Filter)、集計 (Aggregator) 変換でこれらの関数を使用します。',
            string: { title: '文字列関数' },
            logic: { title: '論理・Null関数' },
            math: { title: '数学・数値関数' },
            date: { title: '日付・その他関数' }
        }
      }
    }
  }
};

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

export type TranslationKey = NestedKeyOf<typeof translations.en>;
