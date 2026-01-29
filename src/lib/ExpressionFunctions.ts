
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
        return d;
    }
};

// Helper to expose these to the execution context
export const getExpressionContext = () => {
    return ExpressionFunctions;
};
