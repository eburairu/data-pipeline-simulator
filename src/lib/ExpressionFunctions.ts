
// Basic implementation of standard ETL functions for the simulator

export const ExpressionFunctions = {
    // Logic
    IIF: <T>(condition: boolean, trueVal: T, falseVal: T): T => (condition ? trueVal : falseVal),
    DECODE: <T>(value: unknown, ...args: unknown[]): T | null => {
        // decode(val, search1, result1, search2, result2, ..., default)
        for (let i = 0; i < args.length - 1; i += 2) {
            if (String(value) === String(args[i])) return args[i + 1] as T;
        }
        return args.length % 2 === 1 ? (args[args.length - 1] as T) : null;
    },

    // Null handling
    ISNULL: (val: unknown): boolean => val === null || val === undefined || val === '',
    NVL: <T>(val: T | null | undefined, defaultVal: T): T => (val === null || val === undefined || val === '') ? defaultVal : (val as T),

    // String
    SUBSTR: (str: string, start: number, length?: number): string | null => {
        if (typeof str !== 'string') return null;
        // Standard ETL/SQL uses 1-based index (usually), JS uses 0. Let's assume standard ETL 1-based for familiarity?
        // Actually keep it simple: JS logic for now, or 1-based for realism?
        // Let's stick to standard ETL behavior: 1-based.
        const s = start > 0 ? start - 1 : 0;
        return length ? str.substr(s, length) : str.substr(s);
    },
    INSTR: (str: string, search: string): number => {
        if (typeof str !== 'string') return 0;
        return str.indexOf(search) + 1; // 1-based
    },
    LENGTH: (str: string): number => (typeof str === 'string' ? str.length : 0),
    UPPER: (str: string): string => (typeof str === 'string' ? str.toUpperCase() : str),
    LOWER: (str: string): string => (typeof str === 'string' ? str.toLowerCase() : str),
    CONCAT: (...args: unknown[]): string => args.map(String).join(''),
    TRIM: (str: string): string => (typeof str === 'string' ? str.trim() : str),

    // String Enhancements
    LPAD: (str: string, len: number, pad: string = ' '): string | null => {
        if (str === null || str === undefined) return null;
        const s = String(str);
        if (s.length > len) return s.substring(0, len);
        return s.padStart(len, pad);
    },
    RPAD: (str: string, len: number, pad: string = ' '): string | null => {
        if (str === null || str === undefined) return null;
        const s = String(str);
        if (s.length > len) return s.substring(0, len);
        return s.padEnd(len, pad);
    },
    REVERSE: (str: string): string => {
        if (typeof str !== 'string') return str;
        return str.split('').reverse().join('');
    },
    REPLACE_STR: (str: string, search: string, replace: string): string => {
        if (typeof str !== 'string') return str;
        // Global replace
        return str.split(search).join(replace);
    },
    IS_NUMBER: (val: unknown): boolean => {
        if (val === null || val === undefined || val === '') return false;
        return !isNaN(Number(val));
    },
    IS_SPACES: (val: unknown): boolean => {
        if (typeof val !== 'string') return false;
        return val.trim().length === 0;
    },

    // Encoding & Hashing (Simulated)
    MD5: (str: string): string | null => {
        if (typeof str !== 'string') return null;
        // Simple hash (djb2) -> hex
        let hash = 5381;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash) + str.charCodeAt(i); /* hash * 33 + c */
        }
        return (hash >>> 0).toString(16).padStart(32, '0'); // Simulate 32-char hex
    },
    SHA1: (str: string): string | null => {
        // Similar simulation for visual purpose
        if (typeof str !== 'string') return null;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash).toString(16).padStart(40, '0');
    },
    BASE64_ENCODE: (str: string): string | null => {
        if (typeof str !== 'string') return null;
        try {
            return btoa(unescape(encodeURIComponent(str)));
        } catch { return null; }
    },
    BASE64_DECODE: (str: string): string | null => {
        if (typeof str !== 'string') return null;
        try {
            return decodeURIComponent(escape(atob(str)));
        } catch { return null; }
    },
    AES_ENCRYPT: (str: string, key: string): string | null => {
        // Fake encryption: Base64(Reverse(str) + key) - just to show "change"
        if (!str) return null;
        return btoa(unescape(encodeURIComponent(str.split('').reverse().join('') + '::' + key)));
    },
    AES_DECRYPT: (str: string, key: string): string | null => {
        // Fake decryption
        if (!str) return null;
        try {
            const decoded = decodeURIComponent(escape(atob(str)));
            if (decoded.endsWith('::' + key)) {
                return decoded.substring(0, decoded.length - (key.length + 2)).split('').reverse().join('');
            }
            return null;
        } catch { return null; }
    },

    // JSON Handling
    JSON_VALUE: <T = unknown>(json: string, path: string): T | null => {
        if (!json) return null;
        try {
            const obj = JSON.parse(json);
            // Support simple dot notation and array index: "a.b[0].c"
            // Split by . or [ or ]
            const parts = path.split(/[.[\]]+/).filter(Boolean);
            let current = obj;
            for (const part of parts) {
                if (current === null || current === undefined) return null;
                if (Array.isArray(current)) {
                    const idx = parseInt(part, 10);
                    current = current[idx];
                } else {
                    current = current[part];
                }
            }
            // Return string representation if object, else value
            if (typeof current === 'object' && current !== null) return JSON.stringify(current) as unknown as T;
            return current as T;
        } catch { return null; }
    },

    // Regex
    REG_MATCH: (str: string, pattern: string): boolean => {
        if (typeof str !== 'string' || !pattern) return false;
        try {
            return new RegExp(pattern).test(str);
        } catch { return false; }
    },
    REG_REPLACE: (str: string, pattern: string, replace: string): string => {
        if (typeof str !== 'string' || !pattern) return str;
        try {
            return str.replace(new RegExp(pattern, 'g'), replace || '');
        } catch { return str; }
    },

    // Number Enhancements
    ABS: (val: unknown): number => Math.abs(Number(val)),
    CEIL: (val: unknown): number => Math.ceil(Number(val)),
    FLOOR: (val: unknown): number => Math.floor(Number(val)),
    ROUND: (val: unknown, decimals: number = 0): number => {
        const factor = Math.pow(10, decimals);
        return Math.round(Number(val) * factor) / factor;
    },
    TRUNC: (val: unknown, decimals: number = 0): number => {
        const factor = Math.pow(10, decimals);
        return Math.trunc(Number(val) * factor) / factor;
    },
    MOD: (dividend: unknown, divisor: unknown): number => Number(dividend) % Number(divisor),

    // Date
    GET_DATE: (): Date => new Date(), // Returns Date object
    TO_DATE: (str: string, _format?: string): Date => {
        // Very basic parsing, ignoring format for now as JS Date handles ISO well
        return new Date(str);
    },
    TO_CHAR: (val: unknown, _format?: string): string => {
        if (val instanceof Date) return val.toISOString();
        return String(val);
    },
    DATE_DIFF: (date1: Date, date2: Date, part: string = 'D'): number => {
        const diff = new Date(date1).getTime() - new Date(date2).getTime();
        if (part === 'D') return diff / (1000 * 60 * 60 * 24);
        if (part === 'H') return diff / (1000 * 60 * 60);
        return diff;
    },
    ADD_TO_DATE: (date: Date, amount: number, part: string = 'D'): Date => {
        const d = new Date(date);
        if (part === 'D') d.setDate(d.getDate() + amount);
        else if (part === 'M') d.setMonth(d.getMonth() + amount);
        else if (part === 'Y') d.setFullYear(d.getFullYear() + amount);
        else if (part === 'HH') d.setHours(d.getHours() + amount);
        else if (part === 'MI') d.setMinutes(d.getMinutes() + amount);
        else if (part === 'SS') d.setSeconds(d.getSeconds() + amount);
        return d;
    },
    // Date Enhancements
    GET_DATE_PART: (date: Date, part: string): number | null => {
        const d = new Date(date);
        switch (part) {
            case 'YYYY': return d.getFullYear();
            case 'MM': return d.getMonth() + 1;
            case 'DD': return d.getDate();
            case 'HH': return d.getHours();
            case 'MI': return d.getMinutes();
            case 'SS': return d.getSeconds();
            default: return null;
        }
    },
    LAST_DAY: (date: Date): Date => {
        const d = new Date(date);
        return new Date(d.getFullYear(), d.getMonth() + 1, 0);
    },
    TRUNC_DATE: (date: Date, part: string = 'DD'): Date => {
        const d = new Date(date);
        if (part === 'DD') d.setHours(0, 0, 0, 0);
        else if (part === 'MM') { d.setDate(1); d.setHours(0, 0, 0, 0); }
        else if (part === 'YYYY') { d.setMonth(0, 1); d.setHours(0, 0, 0, 0); }
        return d;
    },
    IS_DATE: (val: unknown, _format?: string): boolean => {
        if (!val) return false;
        const d = new Date(val as string | number | Date);
        return !isNaN(d.getTime());
    },

    // Conversion
    TO_INTEGER: (val: unknown): number => parseInt(String(val), 10),
    TO_DECIMAL: (val: unknown, scale: number = 0): number | null => {
        const num = parseFloat(String(val));
        return isNaN(num) ? null : Number(num.toFixed(scale));
    },
    TO_FLOAT: (val: unknown): number => parseFloat(String(val)),
};

// Helper to expose these to the execution context
export const getExpressionContext = () => {
    return ExpressionFunctions;
};
