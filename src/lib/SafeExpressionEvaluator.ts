/**
 * SafeExpressionEvaluator - セキュアな式評価器
 * 
 * `new Function()` を使用せず、許可リスト方式で式を評価します。
 * セキュリティリスク（XSS、任意コード実行）を排除しながら、
 * ETL式の評価をサポートします。
 */

import type { DataRow, DataValue } from './types';
import { ExpressionFunctions } from './ExpressionFunctions';

/**
 * トークンの種類
 */
type TokenType =
    | 'number'
    | 'string'
    | 'identifier'
    | 'operator'
    | 'comparison'
    | 'logical'
    | 'function'
    | 'paren'
    | 'comma'
    | 'boolean';

/**
 * トークン
 */
interface Token {
    type: TokenType;
    value: string | number | boolean;
    raw: string;
}

/**
 * 許可された演算子
 */
const OPERATORS = new Set(['+', '-', '*', '/', '%']);
const COMPARISON_OPS = new Set(['===', '!==', '==', '!=', '>=', '<=', '>', '<']);
const LOGICAL_OPS = new Set(['&&', '||', '!']);

/**
 * 許可された関数名（ExpressionFunctionsからの関数）
 */
const ALLOWED_FUNCTIONS = new Set(Object.keys(ExpressionFunctions));

/**
 * 式をトークンに分割
 */
function tokenize(expression: string): Token[] {
    const tokens: Token[] = [];
    let pos = 0;
    const expr = expression.trim();

    while (pos < expr.length) {
        const char = expr[pos];

        // 空白をスキップ
        if (/\s/.test(char)) {
            pos++;
            continue;
        }

        // 文字列リテラル
        if (char === '"' || char === "'") {
            const quote = char;
            let value = '';
            pos++; // skip opening quote
            while (pos < expr.length && expr[pos] !== quote) {
                if (expr[pos] === '\\' && pos + 1 < expr.length) {
                    pos++;
                    value += expr[pos];
                } else {
                    value += expr[pos];
                }
                pos++;
            }
            pos++; // skip closing quote
            tokens.push({ type: 'string', value, raw: `${quote}${value}${quote}` });
            continue;
        }

        // 数値リテラル
        if (/\d/.test(char) || (char === '.' && /\d/.test(expr[pos + 1] || ''))) {
            let numStr = '';
            while (pos < expr.length && /[\d.]/.test(expr[pos])) {
                numStr += expr[pos];
                pos++;
            }
            tokens.push({ type: 'number', value: parseFloat(numStr), raw: numStr });
            continue;
        }

        // 識別子（フィールド名、関数名、ブール値）
        if (/[a-zA-Z_$]/.test(char)) {
            let identifier = '';
            while (pos < expr.length && /[a-zA-Z0-9_$]/.test(expr[pos])) {
                identifier += expr[pos];
                pos++;
            }

            // ブール値
            if (identifier === 'true') {
                tokens.push({ type: 'boolean', value: true, raw: identifier });
            } else if (identifier === 'false') {
                tokens.push({ type: 'boolean', value: false, raw: identifier });
            } else if (identifier === 'null' || identifier === 'undefined') {
                tokens.push({ type: 'identifier', value: identifier, raw: identifier });
            } else if (ALLOWED_FUNCTIONS.has(identifier)) {
                tokens.push({ type: 'function', value: identifier, raw: identifier });
            } else {
                tokens.push({ type: 'identifier', value: identifier, raw: identifier });
            }
            continue;
        }

        // 比較演算子と論理演算子（複数文字）
        const threeChar = expr.substring(pos, pos + 3);
        const twoChar = expr.substring(pos, pos + 2);

        if (COMPARISON_OPS.has(threeChar)) {
            tokens.push({ type: 'comparison', value: threeChar, raw: threeChar });
            pos += 3;
            continue;
        }
        if (COMPARISON_OPS.has(twoChar)) {
            tokens.push({ type: 'comparison', value: twoChar, raw: twoChar });
            pos += 2;
            continue;
        }
        if (LOGICAL_OPS.has(twoChar)) {
            tokens.push({ type: 'logical', value: twoChar, raw: twoChar });
            pos += 2;
            continue;
        }

        // 単一文字演算子
        if (OPERATORS.has(char)) {
            tokens.push({ type: 'operator', value: char, raw: char });
            pos++;
            continue;
        }
        if (COMPARISON_OPS.has(char)) {
            tokens.push({ type: 'comparison', value: char, raw: char });
            pos++;
            continue;
        }
        if (char === '!') {
            tokens.push({ type: 'logical', value: char, raw: char });
            pos++;
            continue;
        }

        // 括弧
        if (char === '(' || char === ')') {
            tokens.push({ type: 'paren', value: char, raw: char });
            pos++;
            continue;
        }

        // カンマ
        if (char === ',') {
            tokens.push({ type: 'comma', value: char, raw: char });
            pos++;
            continue;
        }

        // 不明な文字はスキップ
        pos++;
    }

    return tokens;
}

/**
 * パーサー: トークンから式構造を解析して評価
 */
class ExpressionParser {
    private tokens: Token[];
    private pos: number;
    private record: DataRow;
    private parameters: Record<string, string>;

    constructor(
        tokens: Token[],
        record: DataRow,
        parameters: Record<string, string>
    ) {
        this.tokens = tokens;
        this.pos = 0;
        this.record = record;
        this.parameters = parameters;
    }

    parse(): DataValue {
        if (this.tokens.length === 0) return null;
        return this.parseLogicalOr();
    }

    private peek(): Token | undefined {
        return this.tokens[this.pos];
    }

    private consume(): Token | undefined {
        return this.tokens[this.pos++];
    }

    private parseLogicalOr(): DataValue {
        let left = this.parseLogicalAnd();
        while (this.peek()?.type === 'logical' && this.peek()?.value === '||') {
            this.consume();
            const right = this.parseLogicalAnd();
            left = Boolean(left) || Boolean(right);
        }
        return left;
    }

    private parseLogicalAnd(): DataValue {
        let left = this.parseComparison();
        while (this.peek()?.type === 'logical' && this.peek()?.value === '&&') {
            this.consume();
            const right = this.parseComparison();
            left = Boolean(left) && Boolean(right);
        }
        return left;
    }

    private parseComparison(): DataValue {
        let left = this.parseAdditive();
        const token = this.peek();
        if (token?.type === 'comparison') {
            const op = this.consume()!.value as string;
            const right = this.parseAdditive();
            return this.evaluateComparison(left, op, right);
        }
        return left;
    }

    private evaluateComparison(left: DataValue, op: string, right: DataValue): boolean {
        switch (op) {
            case '===': return left === right;
            case '!==': return left !== right;
            case '==': return left == right;
            case '!=': return left != right;
            case '>': return (left as number) > (right as number);
            case '<': return (left as number) < (right as number);
            case '>=': return (left as number) >= (right as number);
            case '<=': return (left as number) <= (right as number);
            default: return false;
        }
    }

    private parseAdditive(): DataValue {
        let left = this.parseMultiplicative();
        while (this.peek()?.type === 'operator' &&
            (this.peek()?.value === '+' || this.peek()?.value === '-')) {
            const op = this.consume()!.value as string;
            const right = this.parseMultiplicative();
            if (op === '+') {
                // 文字列連結または数値加算
                if (typeof left === 'string' || typeof right === 'string') {
                    left = String(left ?? '') + String(right ?? '');
                } else {
                    left = (Number(left) || 0) + (Number(right) || 0);
                }
            } else {
                left = (Number(left) || 0) - (Number(right) || 0);
            }
        }
        return left;
    }

    private parseMultiplicative(): DataValue {
        let left = this.parseUnary();
        while (this.peek()?.type === 'operator' &&
            (this.peek()?.value === '*' || this.peek()?.value === '/' || this.peek()?.value === '%')) {
            const op = this.consume()!.value as string;
            const right = this.parseUnary();
            if (op === '*') {
                left = (Number(left) || 0) * (Number(right) || 0);
            } else if (op === '/') {
                const r = Number(right) || 0;
                left = r === 0 ? null : (Number(left) || 0) / r;
            } else {
                left = (Number(left) || 0) % (Number(right) || 0);
            }
        }
        return left;
    }

    private parseUnary(): DataValue {
        const token = this.peek();
        if (token?.type === 'logical' && token.value === '!') {
            this.consume();
            return !this.parseUnary();
        }
        if (token?.type === 'operator' && token.value === '-') {
            this.consume();
            return -(Number(this.parseUnary()) || 0);
        }
        return this.parsePrimary();
    }

    private parsePrimary(): DataValue {
        const token = this.peek();

        if (!token) return null;

        // 括弧
        if (token.type === 'paren' && token.value === '(') {
            this.consume();
            const result = this.parseLogicalOr();
            if (this.peek()?.type === 'paren' && this.peek()?.value === ')') {
                this.consume();
            }
            return result;
        }

        // 数値リテラル
        if (token.type === 'number') {
            this.consume();
            return token.value as number;
        }

        // 文字列リテラル
        if (token.type === 'string') {
            this.consume();
            return token.value as string;
        }

        // ブール値
        if (token.type === 'boolean') {
            this.consume();
            return token.value as boolean;
        }

        // 関数呼び出し
        if (token.type === 'function') {
            this.consume();
            const funcName = token.value as string;
            const args: DataValue[] = [];

            // '(' を消費
            if (this.peek()?.type === 'paren' && this.peek()?.value === '(') {
                this.consume();

                // 引数をパース
                while (this.peek() && !(this.peek()?.type === 'paren' && this.peek()?.value === ')')) {
                    args.push(this.parseLogicalOr());
                    if (this.peek()?.type === 'comma') {
                        this.consume();
                    }
                }

                // ')' を消費
                if (this.peek()?.type === 'paren' && this.peek()?.value === ')') {
                    this.consume();
                }
            }

            // 関数を実行
            const func = (ExpressionFunctions as Record<string, (...args: unknown[]) => unknown>)[funcName];
            if (func) {
                try {
                    return func(...args) as DataValue;
                } catch {
                    return null;
                }
            }
            return null;
        }

        // 識別子（フィールド名またはパラメータ）
        if (token.type === 'identifier') {
            this.consume();
            const name = token.value as string;

            // null/undefinedリテラル
            if (name === 'null') return null;
            if (name === 'undefined') return undefined;

            // パラメータ（$variable形式でなくても、パラメータとして解決を試みる）
            if (this.parameters[name] !== undefined) {
                return this.parameters[name];
            }

            // レコードフィールド
            if (Object.prototype.hasOwnProperty.call(this.record, name)) {
                return this.record[name];
            }

            return undefined;
        }

        // 不明なトークンはスキップ
        this.consume();
        return null;
    }
}

/**
 * 式を安全に評価します
 * 
 * @param record データ行
 * @param expression 評価する式
 * @param parameters パラメータ（変数置換用）
 * @returns 評価結果
 */
export function safeEvaluateExpression(
    record: DataRow,
    expression: string,
    parameters: Record<string, string> = {}
): DataValue {
    try {
        const tokens = tokenize(expression);
        const parser = new ExpressionParser(tokens, record, parameters);
        return parser.parse();
    } catch {
        // 評価エラーの場合はnullを返す
        return null;
    }
}

/**
 * 式が安全かどうかを検証します
 * 
 * @param expression 検証する式
 * @returns 検証結果
 */
export function validateExpression(expression: string): { valid: boolean; error?: string } {
    try {
        const tokens = tokenize(expression);

        // 危険なパターンのチェック
        const dangerousPatterns = [
            /\beval\b/i,
            /\bFunction\b/i,
            /\bprocess\b/i,
            /\brequire\b/i,
            /\bimport\b/i,
            /\bglobal\b/i,
            /\bwindow\b/i,
            /\bdocument\b/i,
            /\bsetTimeout\b/i,
            /\bsetInterval\b/i,
        ];

        for (const pattern of dangerousPatterns) {
            if (pattern.test(expression)) {
                return { valid: false, error: `Dangerous pattern detected: ${pattern.source}` };
            }
        }

        // 基本的な構文チェック
        let parenCount = 0;
        for (const token of tokens) {
            if (token.type === 'paren') {
                if (token.value === '(') parenCount++;
                if (token.value === ')') parenCount--;
            }
        }
        if (parenCount !== 0) {
            return { valid: false, error: 'Unbalanced parentheses' };
        }

        return { valid: true };
    } catch (e) {
        return { valid: false, error: String(e) };
    }
}

// 後方互換性のためにデフォルトエクスポート
export default safeEvaluateExpression;
