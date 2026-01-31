
import { describe, test, expect } from 'vitest';
import { ExpressionFunctions } from './ExpressionFunctions';

describe('ExpressionFunctions', () => {
    // String Enhancements
    test('LPAD/RPAD should pad strings correctly', () => {
        expect(ExpressionFunctions.LPAD('123', 5, '0')).toBe('00123');
        expect(ExpressionFunctions.RPAD('123', 5, '0')).toBe('12300');
        expect(ExpressionFunctions.LPAD('123', 2, '0')).toBe('12'); // Truncate if shorter? JS padStart doesn't truncate, it returns original if len < str.length. Wait, padStart returns original string if targetLength is less than str.length.
        // IDMC LPAD truncates if target length is smaller? Let's check spec. Usually yes.
        // JS padStart: "If targetLength is less than str.length, then str is returned as-is."
        // IDMC LPAD: "If length is less than the length of the string, LPAD truncates the string."
        // We implemented truncation behavior for realism.
        expect(ExpressionFunctions.LPAD('12345', 3, '0')).toBe('123');
    });

    test('REVERSE should reverse string', () => {
        expect(ExpressionFunctions.REVERSE('abc')).toBe('cba');
    });

    test('REPLACE_STR should replace all occurrences', () => {
        expect(ExpressionFunctions.REPLACE_STR('banana', 'a', 'o')).toBe('bonono');
    });

    test('IS_NUMBER should validate numbers', () => {
        expect(ExpressionFunctions.IS_NUMBER('123')).toBe(true);
        expect(ExpressionFunctions.IS_NUMBER('12.34')).toBe(true);
        expect(ExpressionFunctions.IS_NUMBER('abc')).toBe(false);
        expect(ExpressionFunctions.IS_NUMBER('')).toBe(false);
    });

    test('IS_SPACES should check for whitespace only', () => {
        expect(ExpressionFunctions.IS_SPACES('   ')).toBe(true);
        expect(ExpressionFunctions.IS_SPACES(' a ')).toBe(false);
        expect(ExpressionFunctions.IS_SPACES('')).toBe(true); // Empty string is usually considered not spaces in some ETLs but here check implementation: trim().length === 0. So empty is true.
    });

    // Number Enhancements
    test('Number functions work correctly', () => {
        expect(ExpressionFunctions.ABS(-10)).toBe(10);
        expect(ExpressionFunctions.CEIL(10.1)).toBe(11);
        expect(ExpressionFunctions.FLOOR(10.9)).toBe(10);
        expect(ExpressionFunctions.ROUND(10.55, 1)).toBe(10.6);
        expect(ExpressionFunctions.TRUNC(10.55, 1)).toBe(10.5);
        expect(ExpressionFunctions.MOD(10, 3)).toBe(1);
    });

    // Date Enhancements
    test('Date functions work correctly', () => {
        const d = new Date('2023-01-15T12:30:45');
        expect(ExpressionFunctions.GET_DATE_PART(d, 'YYYY')).toBe(2023);
        expect(ExpressionFunctions.GET_DATE_PART(d, 'MM')).toBe(1);

        const lastDay = ExpressionFunctions.LAST_DAY(new Date('2023-01-01'));
        expect(lastDay.getDate()).toBe(31);
        expect(lastDay.getMonth()).toBe(0); // Jan is 0 in JS Date

        const trunc = ExpressionFunctions.TRUNC_DATE(d, 'DD');
        expect(trunc.getHours()).toBe(0);
        expect(trunc.getMinutes()).toBe(0);

        expect(ExpressionFunctions.IS_DATE('2023-01-01')).toBe(true);
        expect(ExpressionFunctions.IS_DATE('not a date')).toBe(false);
    });

    // Conversion
    test('Conversion functions work correctly', () => {
        expect(ExpressionFunctions.TO_INTEGER('123.45')).toBe(123);
        expect(ExpressionFunctions.TO_DECIMAL('123.456', 2)).toBe(123.46);
        expect(ExpressionFunctions.TO_FLOAT('123.45')).toBe(123.45);
    });
});
