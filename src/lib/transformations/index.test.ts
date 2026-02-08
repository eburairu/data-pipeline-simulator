import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    clearRegistry,
    registerStrategy,
    getStrategy,
    getRegisteredTypes,
    hasStrategy,
    getStrategyCount,
} from './index';

/**
 * テスト用のモックStrategy型（任意のtypeを許容）
 */
interface MockTransformationStrategy {
    readonly type: string;
    execute: (node: unknown, ctx: unknown) => Promise<{ output: unknown[]; continue: boolean }>;
    validate: (node: unknown) => { valid: boolean; errors: string[]; warnings: string[] };
}

describe('Strategy Registration Mechanism', () => {
    beforeEach(() => {
        clearRegistry();
    });

    it('should register and retrieve a strategy', () => {
        const mockStrategy: MockTransformationStrategy = {
            type: 'test',
            execute: async () => ({ output: [], continue: true }),
            validate: () => ({ valid: true, errors: [], warnings: [] }),
        };

        registerStrategy(mockStrategy as any);

        const retrieved = getStrategy('test');
        expect(retrieved).toBeDefined();
        expect(retrieved?.type).toBe('test');
    });

    it('should return undefined for unregistered strategy', () => {
        const retrieved = getStrategy('nonexistent');
        expect(retrieved).toBeUndefined();
    });

    it('should check if strategy is registered', () => {
        const mockStrategy: MockTransformationStrategy = {
            type: 'check_test',
            execute: async () => ({ output: [], continue: true }),
            validate: () => ({ valid: true, errors: [], warnings: [] }),
        };

        expect(hasStrategy('check_test')).toBe(false);
        registerStrategy(mockStrategy as any);
        expect(hasStrategy('check_test')).toBe(true);
    });

    it('should return all registered types', () => {
        const strategy1: MockTransformationStrategy = {
            type: 'type_a',
            execute: async () => ({ output: [], continue: true }),
            validate: () => ({ valid: true, errors: [], warnings: [] }),
        };
        const strategy2: MockTransformationStrategy = {
            type: 'type_b',
            execute: async () => ({ output: [], continue: true }),
            validate: () => ({ valid: true, errors: [], warnings: [] }),
        };

        registerStrategy(strategy1 as any);
        registerStrategy(strategy2 as any);

        const types = getRegisteredTypes();
        expect(types).toContain('type_a');
        expect(types).toContain('type_b');
    });

    it('should count registered strategies', () => {
        expect(getStrategyCount()).toBe(0);

        const mockStrategy: MockTransformationStrategy = {
            type: 'count_test',
            execute: async () => ({ output: [], continue: true }),
            validate: () => ({ valid: true, errors: [], warnings: [] }),
        };
        registerStrategy(mockStrategy as any);

        expect(getStrategyCount()).toBe(1);
    });

    it('should overwrite existing strategy with warning', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

        const original: MockTransformationStrategy = {
            type: 'overwrite_test',
            execute: async () => ({ output: [{ original: true }], continue: true }),
            validate: () => ({ valid: true, errors: [], warnings: [] }),
        };

        const replacement: MockTransformationStrategy = {
            type: 'overwrite_test',
            execute: async () => ({ output: [{ replacement: true }], continue: true }),
            validate: () => ({ valid: true, errors: [], warnings: [] }),
        };

        registerStrategy(original as any);
        registerStrategy(replacement as any);

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('overwrite_test'));

        const retrieved = getStrategy('overwrite_test');
        expect(retrieved).toBe(replacement);

        consoleSpy.mockRestore();
    });

    it('should clear all strategies', () => {
        const mockStrategy: MockTransformationStrategy = {
            type: 'clear_test',
            execute: async () => ({ output: [], continue: true }),
            validate: () => ({ valid: true, errors: [], warnings: [] }),
        };
        registerStrategy(mockStrategy as any);

        expect(getStrategyCount()).toBe(1);
        clearRegistry();
        expect(getStrategyCount()).toBe(0);
        expect(hasStrategy('clear_test')).toBe(false);
    });
});
