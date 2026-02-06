import { type CompressionFormat } from './types';

export interface DecompressedFile {
  filename: string;
  content: string;
}

export interface DecompressedResult {
  files: DecompressedFile[];
  originalFormatChain: CompressionFormat[];
}

const GZ_PREFIX = '[GZ]';
const ZIP_PREFIX = '[ZIP]';
const TAR_HEADER_START = '[TAR:';
const TAR_HEADER_END = ']';
const FILE_SEPARATOR_PREFIX = '--FILE:';
const FILE_SEPARATOR_SUFFIX = '--';

/**
 * Checks if the content is compressed with any supported format
 */
export const isCompressed = (content: string): boolean => {
  return content.startsWith(GZ_PREFIX) || content.startsWith(ZIP_PREFIX) || content.startsWith(TAR_HEADER_START);
};

/**
 * Compresses content into a single format layer.
 * For 'tar', it wraps the content as a single file entry if multiple files aren't provided (basic usage).
 * To create a proper tar with multiple files, logic needs to handle that specifically, but for now
 * we assume a single data stream is being tarred (like a file).
 */
export const compress = (content: string, format: CompressionFormat, filename: string): string => {
  if (format === 'none') return content;

  if (format === 'gz') {
    return `${GZ_PREFIX}${content}`;
  }

  if (format === 'zip') {
    return `${ZIP_PREFIX}${content}`;
  }

  if (format === 'tar') {
    // Single file tar wrapper
    // Header: [TAR:filename]
    // Body: --FILE:filename--\ncontent
    return `${TAR_HEADER_START}${filename}${TAR_HEADER_END}${FILE_SEPARATOR_PREFIX}${filename}${FILE_SEPARATOR_SUFFIX}\n${content}`;
  }

  return content;
};

/**
 * Helper to bundle multiple contents into a single TAR representation
 */
export const bundleTar = (files: { filename: string; content: string }[]): string => {
  if (files.length === 0) return '';
  const filenames = files.map(f => f.filename).join(',');
  let tarContent = `${TAR_HEADER_START}${filenames}${TAR_HEADER_END}`;
  
  files.forEach(f => {
    tarContent += `${FILE_SEPARATOR_PREFIX}${f.filename}${FILE_SEPARATOR_SUFFIX}
${f.content}
`;
  });
  
  // Remove last newline to be clean? Or keep it. 
  // Let's trim the last newline for consistency if added by loop
  return tarContent.trimEnd(); 
};

/**
 * Recursively decompresses content until no known prefixes remain.
 * Returns a list of all resulting "leaf" files.
 */
export const decompressRecursive = (content: string, baseFilename: string): DecompressedResult => {
  const formatChain: CompressionFormat[] = [];
  
  // Queue of files to process: { content, filename }
  // We start with the input content.
  let processingQueue: { content: string; filename: string }[] = [{ content, filename: baseFilename }];
  let finishedFiles: DecompressedFile[] = [];

  // Safety break for recursion depth
  let iterations = 0;
  const MAX_ITERATIONS = 100;

  // We process level by level. 
  // Note: This BFS approach might lose the exact "chain" order if mixing branches, 
  // but usually we unwrap layer by layer.
  
  while (processingQueue.length > 0 && iterations < MAX_ITERATIONS) {
    iterations++;
    const currentBatch = [...processingQueue];
    processingQueue = [];
    
    let layerChanged = false;

    for (const item of currentBatch) {
      const { content: raw, filename } = item;

      if (raw.startsWith(GZ_PREFIX)) {
        layerChanged = true;
        // Strip GZ
        const inner = raw.substring(GZ_PREFIX.length);
        const innerName = filename.endsWith('.gz') ? filename.slice(0, -3) : filename;
        processingQueue.push({ content: inner, filename: innerName });
        // Only add to chain if it's the first file (assuming uniform compression for the layer)
        // or we can track chain per file. For simplicity, we just track we found GZ.
        // But this logic is flawed for the "chain" return. 
        // Let's just focus on getting the files out first.
      } 
      else if (raw.startsWith(ZIP_PREFIX)) {
        layerChanged = true;
        const inner = raw.substring(ZIP_PREFIX.length);
        const innerName = filename.endsWith('.zip') ? filename.slice(0, -4) : filename;
        processingQueue.push({ content: inner, filename: innerName });
      }
      else if (raw.startsWith(TAR_HEADER_START)) {
        layerChanged = true;
        // Parse TAR
        const headerEndIndex = raw.indexOf(TAR_HEADER_END);
        if (headerEndIndex === -1) {
          // Corrupt tar, treat as raw
          finishedFiles.push(item);
          continue;
        }

        const fileListStr = raw.substring(TAR_HEADER_START.length, headerEndIndex);
        const filenames = fileListStr.split(',');
        
        let body = raw.substring(headerEndIndex + TAR_HEADER_END.length);
        
        // Extract each file
        for (const fname of filenames) {
          const separator = `${FILE_SEPARATOR_PREFIX}${fname}${FILE_SEPARATOR_SUFFIX}`;
          const sepIndex = body.indexOf(separator);
          if (sepIndex === -1) continue; // Should not happen

          // Content starts after separator + newline
          const contentStart = sepIndex + separator.length; 
          // Find next separator or end of string.
          // Note: This simple parsing assumes separators don't appear in content.
          // In a robust implementation, we'd need length headers or escape sequences.
          // For simulation, we assume our separators are unique enough or we scan carefully.
          // To be safer, we can look for the *next* separator.
          
          let contentEnd = body.length;
          
          // Find the nearest next separator
          let nearestNextSepIndex = -1;
          for (const nextName of filenames) {
             const nextSep = `${FILE_SEPARATOR_PREFIX}${nextName}${FILE_SEPARATOR_SUFFIX}`;
             const idx = body.indexOf(nextSep, contentStart); // Search after current content start
             if (idx !== -1) {
               if (nearestNextSepIndex === -1 || idx < nearestNextSepIndex) {
                 nearestNextSepIndex = idx;
               }
             }
          }
          
          if (nearestNextSepIndex !== -1) {
            contentEnd = nearestNextSepIndex;
          }

          let fileContent = body.substring(contentStart, contentEnd);
          // Trim leading newline if present (format adds newline after separator)
          fileContent = fileContent.replace(/^\r?\n/, '');
          // Trim trailing newline if present (format adds newline after content)
          fileContent = fileContent.replace(/\r?\n$/, '');

          processingQueue.push({ content: fileContent, filename: fname });
        }
      } 
      else {
        // No known prefix, this is a leaf file
        finishedFiles.push(item);
      }
    }

    if (!layerChanged && processingQueue.length > 0) {
      // Nothing was decompressed in this pass, but queue has items?
      // Means they are just raw items that we pushed back?
      // No, if they didn't match prefixes, they went to finishedFiles.
      // So queue should be empty unless we matched something.
    }
  }

  return {
    files: finishedFiles,
    originalFormatChain: formatChain // TODO: correctly populate if needed, or remove
  };
};

/**
 * Applies a sequence of compression actions.
 */
export const applyCompressionActions = (
  content: string, 
  actions: CompressionFormat[], 
  baseFilename: string
): { content: string, finalFilename: string } => {
  let currentContent = content;
  let currentFilename = baseFilename;

  for (const action of actions) {
    if (action === 'none') continue;
    
    // Update filename extension
    if (action === 'gz') currentFilename += '.gz';
    else if (action === 'zip') currentFilename += '.zip';
    else if (action === 'tar') currentFilename += '.tar';

    currentContent = compress(currentContent, action, currentFilename);
  }

  return { content: currentContent, finalFilename: currentFilename };
};
