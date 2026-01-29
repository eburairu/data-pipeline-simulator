
// Basic implementation of standard ETL functions for the simulator

export const ExpressionFunctions = {
    // Logic
    IIF: (condition: boolean, trueVal: any, falseVal: any) => (condition ? trueVal : falseVal),
    DECODE: (value: any, ...args: any[]) => {
        // decode(val, search1, result1, search2, result2, ..., default)
        for (let i = 0; i < args.length - 1; i += 2) {
            if (String(value) === String(args[i])) return args[i + 1];
        }
        return args.length % 2 === 1 ? args[args.length - 1] : null;
    },

    // Null handling
    ISNULL: (val: any) => val === null || val === undefined || val === '',
    NVL: (val: any, defaultVal: any) => (val === null || val === undefined || val === '') ? defaultVal : val,

    // String
    SUBSTR: (str: string, start: number, length?: number) => {
        if (typeof str !== 'string') return null;
        // IDMC/SQL uses 1-based index (usually), JS uses 0. Let's assume standard ETL 1-based for familiarity?
        // Actually keep it simple: JS logic for now, or 1-based for realism?
        // Let's stick to standard ETL behavior: 1-based.
        const s = start > 0 ? start - 1 : 0;
        return length ? str.substr(s, length) : str.substr(s);
    },
    INSTR: (str: string, search: string) => {
        if (typeof str !== 'string') return 0;
        return str.indexOf(search) + 1; // 1-based
    },
    LENGTH: (str: string) => (typeof str === 'string' ? str.length : 0),
    UPPER: (str: string) => (typeof str === 'string' ? str.toUpperCase() : str),
    LOWER: (str: string) => (typeof str === 'string' ? str.toLowerCase() : str),
    CONCAT: (...args: string[]) => args.join(''),
    TRIM: (str: string) => (typeof str === 'string' ? str.trim() : str),

    // String Enhancements
    LPAD: (str: string, len: number, pad: string = ' ') => {
        if (str === null || str === undefined) return null;
        const s = String(str);
        if (s.length > len) return s.substring(0, len);
        return s.padStart(len, pad);
    },
    RPAD: (str: string, len: number, pad: string = ' ') => {
        if (str === null || str === undefined) return null;
        const s = String(str);
        if (s.length > len) return s.substring(0, len);
        return s.padEnd(len, pad);
    },
    REVERSE: (str: string) => {
        if (typeof str !== 'string') return str;
        return str.split('').reverse().join('');
    },
    REPLACE_STR: (str: string, search: string, replace: string) => {
        if (typeof str !== 'string') return str;
        // Global replace
        return str.split(search).join(replace);
    },
    IS_NUMBER: (val: any) => {
        if (val === null || val === undefined || val === '') return false;
        return !isNaN(Number(val));
    },
    IS_SPACES: (val: any) => {
        if (typeof val !== 'string') return false;
        return val.trim().length === 0;
    },

    // Number Enhancements
    ABS: (val: any) => Math.abs(Number(val)),
    CEIL: (val: any) => Math.ceil(Number(val)),
    FLOOR: (val: any) => Math.floor(Number(val)),
    ROUND: (val: any, decimals: number = 0) => {
        const factor = Math.pow(10, decimals);
        return Math.round(Number(val) * factor) / factor;
    },
    TRUNC: (val: any, decimals: number = 0) => {
        const factor = Math.pow(10, decimals);
        return Math.trunc(Number(val) * factor) / factor;
    },
    MOD: (dividend: any, divisor: any) => Number(dividend) % Number(divisor),

    // Date
    GET_DATE: () => new Date(), // Returns Date object
    TO_DATE: (str: string, format?: string) => {
        // Very basic parsing, ignoring format for now as JS Date handles ISO well
        return new Date(str);
    },
    TO_CHAR: (val: any, format?: string) => {
        if (val instanceof Date) return val.toISOString();
        return String(val);
    },
    DATE_DIFF: (date1: Date, date2: Date, part: string = 'D') => {
        const diff = new Date(date1).getTime() - new Date(date2).getTime();
        if (part === 'D') return diff / (1000 * 60 * 60 * 24);
        if (part === 'H') return diff / (1000 * 60 * 60);
        return diff;
    },
    ADD_TO_DATE: (date: Date, amount: number, part: string = 'D') => {
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
    GET_DATE_PART: (date: Date, part: string) => {
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
    LAST_DAY: (date: Date) => {
        const d = new Date(date);
        return new Date(d.getFullYear(), d.getMonth() + 1, 0);
    },
    TRUNC_DATE: (date: Date, part: string = 'DD') => {
        const d = new Date(date);
        if (part === 'DD') d.setHours(0, 0, 0, 0);
        else if (part === 'MM') { d.setDate(1); d.setHours(0, 0, 0, 0); }
        else if (part === 'YYYY') { d.setMonth(0, 1); d.setHours(0, 0, 0, 0); }
        return d;
    },
    IS_DATE: (val: any, format?: string) => {
        if (!val) return false;
        const d = new Date(val);
        return !isNaN(d.getTime());
    },

    // Conversion
    TO_INTEGER: (val: any) => parseInt(String(val), 10),
    TO_DECIMAL: (val: any, scale: number = 0) => {
        const num = parseFloat(String(val));
        return isNaN(num) ? null : Number(num.toFixed(scale));
    },
    TO_FLOAT: (val: any) => parseFloat(String(val)),
};

// Helper to expose these to the execution context
export const getExpressionContext = () => {
    return ExpressionFunctions;
};
