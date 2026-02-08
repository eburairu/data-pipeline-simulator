import { compress, decompressRecursive, applyCompressionActions, isCompressed, bundleTar } from './ArchiveEngine';
import { describe, it, expect } from 'vitest';

describe('ArchiveEngine', () => {
    describe('isCompressed', () => {
        it('should return true for all supported formats', () => {
            expect(isCompressed('[GZ]data')).toBe(true);
            expect(isCompressed('[ZIP]data')).toBe(true);
            expect(isCompressed('[TAR:file.txt]data')).toBe(true);
        });

        it('should return false for uncompressed content', () => {
            expect(isCompressed('raw data')).toBe(false);
            expect(isCompressed('')).toBe(false);
            expect(isCompressed('[NOT_A_FORMAT]data')).toBe(false);
        });
    });

    describe('Single Level Compression', () => {
        it('should handle gz compression and decompression', () => {
            const content = 'test data';
            const compressed = compress(content, 'gz', 'test.txt');
            expect(compressed).toBe('[GZ]test data');
            
            const decompressed = decompressRecursive(compressed, 'test.txt.gz');
            expect(decompressed.files).toHaveLength(1);
            expect(decompressed.files[0].content).toBe('test data');
            expect(decompressed.files[0].filename).toBe('test.txt');
        });

        it('should handle zip compression and decompression', () => {
            const content = 'zip data';
            const compressed = compress(content, 'zip', 'test.txt');
            expect(compressed).toBe('[ZIP]zip data');
            
            const decompressed = decompressRecursive(compressed, 'test.txt.zip');
            expect(decompressed.files).toHaveLength(1);
            expect(decompressed.files[0].content).toBe('zip data');
            expect(decompressed.files[0].filename).toBe('test.txt');
        });

        it('should return original content for "none" format', () => {
            const content = 'no compression';
            expect(compress(content, 'none', 'test.txt')).toBe(content);
        });
    });

    describe('TAR Bundling and Extraction', () => {
        it('should bundle and extract multiple files correctly', () => {
            const files = [
                { filename: 'file1.csv', content: 'id,name\n1,Alice' },
                { filename: 'file2.txt', content: 'hello world' }
            ];
            
            const tarContent = bundleTar(files);
            expect(tarContent).toContain('[TAR:file1.csv,file2.txt]');
            
            const result = decompressRecursive(tarContent, 'archive.tar');
            expect(result.files).toHaveLength(2);
            expect(result.files.find(f => f.filename === 'file1.csv')?.content).toBe('id,name\n1,Alice');
            expect(result.files.find(f => f.filename === 'file2.txt')?.content).toBe('hello world');
        });

        it('should handle single file in tar via compress function', () => {
            const content = 'data';
            const tar = compress(content, 'tar', 'data.txt');
            const result = decompressRecursive(tar, 'data.txt.tar');
            expect(result.files).toHaveLength(1);
            expect(result.files[0].filename).toBe('data.txt');
            expect(result.files[0].content).toBe('data');
        });

        it('should return empty string when bundling empty file list', () => {
            expect(bundleTar([])).toBe('');
        });
    });

    describe('Recursive Decompression (Nested Formats)', () => {
        it('should handle tar.gz', () => {
            const content = 'csv data';
            const tar = compress(content, 'tar', 'data.csv');
            const final = compress(tar, 'gz', 'data.tar');

            const result = decompressRecursive(final, 'data.tar.gz');
            expect(result.files).toHaveLength(1);
            expect(result.files[0].filename).toBe('data.csv');
            expect(result.files[0].content).toBe('csv data');
        });

        it('should handle complex nesting (gz inside tar inside gz)', () => {
             const csvContent = 'id,val\n1,a';
             const innerGz = compress(csvContent, 'gz', 'file1.csv');
             const tarContent = bundleTar([{ filename: 'file1.csv.gz', content: innerGz }]);
             const finalGz = compress(tarContent, 'gz', 'archive.tar');
             
             const result = decompressRecursive(finalGz, 'archive.tar.gz');
             
             expect(result.files).toHaveLength(1);
             expect(result.files[0].filename).toBe('file1.csv');
             expect(result.files[0].content).toBe(csvContent);
        });
    });

    describe('Sequential Actions', () => {
        it('should apply compression actions sequentially', () => {
            const content = 'raw';
            const res = applyCompressionActions(content, ['gz', 'tar', 'gz'], 'data.csv');
            expect(res.finalFilename).toBe('data.csv.gz.tar.gz');
            expect(res.content.startsWith('[GZ][TAR:')).toBe(true);
        });

        it('should skip "none" action in sequence', () => {
            const content = 'raw';
            const res = applyCompressionActions(content, ['none', 'gz'], 'data.csv');
            expect(res.finalFilename).toBe('data.csv.gz');
            expect(res.content).toBe('[GZ]raw');
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle malformed TAR header gracefully', () => {
            const malformed = '[TAR:file1.txtfile2.txt]--FILE:file1.txt--\ncontent';
            const result = decompressRecursive(malformed, 'bad.tar');
            // Depending on implementation, it might fail to find files or return raw.
            // Current implementation returns raw if TAR_HEADER_END is not found.
            // If header is found but contents are weird:
            const result2 = decompressRecursive('[TAR:file1.txt]MissingSeparator', 'bad.tar');
            expect(result2.files).toHaveLength(0); // Files list says file1.txt but separator missing
        });

        it('should return as-is if no compression prefix is found', () => {
            const raw = 'not compressed';
            const result = decompressRecursive(raw, 'test.txt');
            expect(result.files).toHaveLength(1);
            expect(result.files[0].content).toBe(raw);
            expect(result.files[0].filename).toBe('test.txt');
        });

        it('should handle recursive depth limit', () => {
            // Create a self-referencing lookalike or just very deep
            let deep = 'data';
            for(let i=0; i<150; i++) {
                deep = '[GZ]' + deep;
            }
            const result = decompressRecursive(deep, 'deep.gz');
            // Should stop at MAX_ITERATIONS (100)
            expect(result.files).toHaveLength(0); // Still in processingQueue after 100 iterations
        });

        it('should handle empty content compression and decompression', () => {
            const empty = '';
            const compressed = compress(empty, 'gz', 'empty.txt');
            expect(compressed).toBe('[GZ]');
            const result = decompressRecursive(compressed, 'empty.txt.gz');
            expect(result.files).toHaveLength(1);
            expect(result.files[0].content).toBe('');
        });

        it('should be robust against separator lookalikes in content', () => {
            const content = 'This is a fake separator: --FILE:other.txt-- and should not be split.';
            const tar = compress(content, 'tar', 'real.txt');
            // tar format: [TAR:real.txt]--FILE:real.txt--\n<content>
            const result = decompressRecursive(tar, 'archive.tar');
            expect(result.files).toHaveLength(1);
            expect(result.files[0].filename).toBe('real.txt');
            expect(result.files[0].content).toBe(content);
        });
    });
});
