/**
 * SafeExpressionEvaluator のテスト
 * 
 * セキュアな式評価が正しく動作することを確認します。
 */

import { describe, it, expect } from 'vitest';
import { safeEvaluateExpression, validateExpression } from './SafeExpressionEvaluator';

describe('SafeExpressionEvaluator', () => {
    describe('基本的な式評価', () => {
        it('数値リテラルを評価できる', () => {
            expect(safeEvaluateExpression({}, '42')).toBe(42);
            expect(safeEvaluateExpression({}, '3.14')).toBe(3.14);
        });

        it('文字列リテラルを評価できる', () => {
            expect(safeEvaluateExpression({}, '"hello"')).toBe('hello');
            expect(safeEvaluateExpression({}, "'world'")).toBe('world');
        });

        it('ブール値を評価できる', () => {
            expect(safeEvaluateExpression({}, 'true')).toBe(true);
            expect(safeEvaluateExpression({}, 'false')).toBe(false);
        });

        it('nullを評価できる', () => {
            expect(safeEvaluateExpression({}, 'null')).toBe(null);
        });
    });

    describe('算術演算', () => {
        it('加算ができる', () => {
            expect(safeEvaluateExpression({}, '2 + 3')).toBe(5);
            expect(safeEvaluateExpression({}, '10 + 20 + 30')).toBe(60);
        });

        it('減算ができる', () => {
            expect(safeEvaluateExpression({}, '10 - 3')).toBe(7);
        });

        it('乗算ができる', () => {
            expect(safeEvaluateExpression({}, '4 * 5')).toBe(20);
        });

        it('除算ができる', () => {
            expect(safeEvaluateExpression({}, '20 / 4')).toBe(5);
        });

        it('ゼロ除算はnullを返す', () => {
            expect(safeEvaluateExpression({}, '10 / 0')).toBe(null);
        });

        it('剰余演算ができる', () => {
            expect(safeEvaluateExpression({}, '10 % 3')).toBe(1);
        });

        it('演算子の優先順位が正しい', () => {
            expect(safeEvaluateExpression({}, '2 + 3 * 4')).toBe(14);
            expect(safeEvaluateExpression({}, '(2 + 3) * 4')).toBe(20);
        });
    });

    describe('比較演算', () => {
        it('等価比較ができる', () => {
            expect(safeEvaluateExpression({}, '5 == 5')).toBe(true);
            expect(safeEvaluateExpression({}, '5 === 5')).toBe(true);
            expect(safeEvaluateExpression({}, '5 != 3')).toBe(true);
        });

        it('大小比較ができる', () => {
            expect(safeEvaluateExpression({}, '5 > 3')).toBe(true);
            expect(safeEvaluateExpression({}, '3 < 5')).toBe(true);
            expect(safeEvaluateExpression({}, '5 >= 5')).toBe(true);
            expect(safeEvaluateExpression({}, '5 <= 5')).toBe(true);
        });
    });

    describe('論理演算', () => {
        it('AND演算ができる', () => {
            expect(safeEvaluateExpression({}, 'true && true')).toBe(true);
            expect(safeEvaluateExpression({}, 'true && false')).toBe(false);
        });

        it('OR演算ができる', () => {
            expect(safeEvaluateExpression({}, 'false || true')).toBe(true);
            expect(safeEvaluateExpression({}, 'false || false')).toBe(false);
        });

        it('NOT演算ができる', () => {
            expect(safeEvaluateExpression({}, '!true')).toBe(false);
            expect(safeEvaluateExpression({}, '!false')).toBe(true);
        });
    });

    describe('フィールド参照', () => {
        it('レコードフィールドを参照できる', () => {
            const record = { name: 'Alice', age: 30 };
            expect(safeEvaluateExpression(record, 'name')).toBe('Alice');
            expect(safeEvaluateExpression(record, 'age')).toBe(30);
        });

        it('フィールドを使った計算ができる', () => {
            const record = { price: 100, quantity: 3 };
            expect(safeEvaluateExpression(record, 'price * quantity')).toBe(300);
        });

        it('フィールドを使った比較ができる', () => {
            const record = { status: 'active', count: 10 };
            expect(safeEvaluateExpression(record, 'count > 5')).toBe(true);
        });
    });

    describe('パラメータ参照', () => {
        it('パラメータを参照できる', () => {
            const record = { name: 'Bob' };
            const params = { threshold: '50' };
            expect(safeEvaluateExpression(record, 'threshold', params)).toBe('50');
        });
    });

    describe('関数呼び出し', () => {
        it('許可された関数を呼び出せる', () => {
            expect(safeEvaluateExpression({}, 'UPPER("hello")')).toBe('HELLO');
            expect(safeEvaluateExpression({}, 'LOWER("WORLD")')).toBe('world');
            expect(safeEvaluateExpression({}, 'LENGTH("test")')).toBe(4);
        });

        it('CONCAT関数が動作する', () => {
            expect(safeEvaluateExpression({}, 'CONCAT("Hello", " ", "World")')).toBe('Hello World');
        });

        it('IIF関数が動作する', () => {
            expect(safeEvaluateExpression({}, 'IIF(true, "yes", "no")')).toBe('yes');
            expect(safeEvaluateExpression({}, 'IIF(false, "yes", "no")')).toBe('no');
        });

        it('NVL関数が動作する', () => {
            expect(safeEvaluateExpression({}, 'NVL(null, "default")')).toBe('default');
            expect(safeEvaluateExpression({}, 'NVL("value", "default")')).toBe('value');
        });

        it('TRIM関数が動作する', () => {
            expect(safeEvaluateExpression({}, 'TRIM("  hello  ")')).toBe('hello');
        });

        it('ROUND関数が動作する', () => {
            expect(safeEvaluateExpression({}, 'ROUND(3.14159, 2)')).toBe(3.14);
        });
    });

    describe('複合式', () => {
        it('フィールド参照と関数の組み合わせ', () => {
            const record = { firstName: 'john', lastName: 'doe' };
            expect(safeEvaluateExpression(record, 'UPPER(firstName)')).toBe('JOHN');
        });

        it('条件式と関数の組み合わせ', () => {
            const record = { value: null };
            expect(safeEvaluateExpression(record, 'IIF(ISNULL(value), "empty", "filled")')).toBe('empty');
        });
    });

    describe('セキュリティ検証', () => {
        it('eval関数は許可されない', () => {
            const result = validateExpression('eval("alert(1)")');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('Dangerous pattern');
        });

        it('Function構築は許可されない', () => {
            const result = validateExpression('new Function("return 1")');
            expect(result.valid).toBe(false);
        });

        it('processへのアクセスは許可されない', () => {
            const result = validateExpression('process.exit(1)');
            expect(result.valid).toBe(false);
        });

        it('requireは許可されない', () => {
            const result = validateExpression('require("fs")');
            expect(result.valid).toBe(false);
        });

        it('windowへのアクセスは許可されない', () => {
            const result = validateExpression('window.location');
            expect(result.valid).toBe(false);
        });

        it('括弧のバランスをチェックする', () => {
            const result = validateExpression('((1 + 2)');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('parentheses');
        });

        it('正当な式は許可される', () => {
            const result = validateExpression('field1 + field2');
            expect(result.valid).toBe(true);
        });
    });

    describe('エラーハンドリング', () => {
        it('不正な式はnullを返す', () => {
            expect(safeEvaluateExpression({}, '')).toBe(null);
        });

        it('存在しないフィールドはundefinedを返す', () => {
            expect(safeEvaluateExpression({}, 'nonExistent')).toBe(undefined);
        });
    });
});
