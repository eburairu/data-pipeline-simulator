import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export interface VFile {
  name: string;
  host: string; // ホスト名 (e.g., 'localhost', 'server-1')
  path: string; // ディレクトリパス (e.g., '/source')
  content: string;
  createdAt: number;
}

interface FileSystemContextType {
  files: VFile[];
  writeFile: (host: string, path: string, name: string, content: string) => void;
  moveFile: (fileName: string, fromHost: string, fromPath: string, toHost: string, toPath: string, newFileName?: string) => void;
  deleteFile: (host: string, fileName: string, atPath: string) => void;
  listFiles: (host: string, path: string) => VFile[];
}

const FileSystemContext = createContext<FileSystemContextType | undefined>(undefined);

export const FileSystemProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [files, setFiles] = useState<VFile[]>([]);

  const writeFile = useCallback((host: string, path: string, name: string, content: string) => {
    const newFile: VFile = {
      name,
      host,
      path,
      content,
      createdAt: Date.now(),
    };
    setFiles((prev) => [...prev, newFile]);
    console.log(`[FS] Wrote file: ${host}:${path}/${name}`);
  }, []);

  const moveFile = useCallback((fileName: string, fromHost: string, fromPath: string, toHost: string, toPath: string, newFileName?: string) => {
    setFiles((prev) =>
      prev.map((f) => {
        if (f.name === fileName && f.host === fromHost && f.path === fromPath) {
          const targetName = newFileName || fileName;
          console.log(`[FS] Moved file: ${fileName} from ${fromHost}:${fromPath} to ${toHost}:${toPath} as ${targetName}`);
          return { ...f, host: toHost, path: toPath, name: targetName };
        }
        return f;
      })
    );
  }, []);

  const deleteFile = useCallback((host: string, fileName: string, atPath: string) => {
    setFiles((prev) => prev.filter((f) => !(f.name === fileName && f.host === host && f.path === atPath)));
    console.log(`[FS] Deleted file: ${host}:${atPath}/${fileName}`);
  }, []);

  const listFiles = useCallback((host: string, path: string) => {
    return files.filter((f) => f.host === host && f.path === path);
  }, [files]);

  return (
    <FileSystemContext.Provider value={{ files, writeFile, moveFile, deleteFile, listFiles }}>
      {children}
    </FileSystemContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useFileSystem = () => {
  const context = useContext(FileSystemContext);
  if (!context) {
    throw new Error('useFileSystem must be used within a FileSystemProvider');
  }
  return context;
};
