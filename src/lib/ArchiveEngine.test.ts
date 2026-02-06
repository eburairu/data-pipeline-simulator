import { compress, decompressRecursive, applyCompressionActions } from './ArchiveEngine';
import { describe, it, expect } from 'vitest';

describe('ArchiveEngine', () => {
    it('should handle single level compression', () => {
        const content = 'test data';
        const compressed = compress(content, 'gz', 'test.txt');
        expect(compressed).toBe('[GZ]test data');
        
        const decompressed = decompressRecursive(compressed, 'test.txt.gz');
        expect(decompressed.files).toHaveLength(1);
        expect(decompressed.files[0].content).toBe('test data');
        expect(decompressed.files[0].filename).toBe('test.txt');
    });

    it('should handle multi-level compression (tar.gz)', () => {
        const content = 'csv data';
        // 1. GZ
        const gz = compress(content, 'gz', 'data.csv');
        // 2. TAR
        const tar = compress(gz, 'tar', 'data.csv.gz');
        // 3. GZ (final tar.gz)
        const final = compress(tar, 'gz', 'data.tar');

        const result = decompressRecursive(final, 'data.tar.gz');
        expect(result.files).toHaveLength(1);
        expect(result.files[0].filename).toBe('data.csv');
        expect(result.files[0].content).toBe('csv data');
    });

    it('should handle multiple files in tar', () => {
        // Create manual TAR content
        const tarContent = '[TAR:file1.txt,file2.txt]--FILE:file1.txt--\ncontent1\n--FILE:file2.txt--\ncontent2';
        
        const result = decompressRecursive(tarContent, 'archive.tar');
        expect(result.files).toHaveLength(2);
        expect(result.files.find(f => f.filename === 'file1.txt')?.content).toBe('content1');
        expect(result.files.find(f => f.filename === 'file2.txt')?.content).toBe('content2');
    });
    
    it('should handle nested compression in tar (tar.gz containing csv.gz)', () => {
         // file1.csv.gz inside archive.tar.gz
         const csvContent = `id,val
1,a`;
         const gzContent = `[GZ]${csvContent}`;
         
         const tarContent = `[TAR:file1.csv.gz]--FILE:file1.csv.gz--
${gzContent}`;
         const finalGz = `[GZ]${tarContent}`;
         
         const result = decompressRecursive(finalGz, 'archive.tar.gz');
         
         // Should recursively unpack:
         // 1. Un-GZ -> tarContent
         // 2. Un-TAR -> file1.csv.gz (content: gzContent)
         // 3. Un-GZ (inner) -> file1.csv (content: csvContent)
         
         expect(result.files).toHaveLength(1);
         expect(result.files[0].filename).toBe('file1.csv');
         expect(result.files[0].content).toBe(csvContent);
    });

    it('should apply compression actions sequentially', () => {
        const content = 'raw';
        const res = applyCompressionActions(content, ['gz', 'tar', 'gz'], 'data.csv');
        expect(res.finalFilename).toBe('data.csv.gz.tar.gz');
        expect(res.content.startsWith('[GZ][TAR:')).toBe(true);
    });
});
