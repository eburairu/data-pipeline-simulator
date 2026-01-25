import React, { createContext, useContext, useState, type ReactNode } from 'react';

export interface VFile {
  name: string;
  path: string; // ディレクトリパス (e.g., '/source')
  content: string;
  createdAt: number;
}

interface FileSystemContextType {
  files: VFile[];
  writeFile: (path: string, name: string, content: string) => void;
  moveFile: (fileName: string, fromPath: string, toPath: string) => void;
  deleteFile: (fileName: string, atPath: string) => void;
  listFiles: (path: string) => VFile[];
}

const FileSystemContext = createContext<FileSystemContextType | undefined>(undefined);

export const FileSystemProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [files, setFiles] = useState<VFile[]>([]);

  const writeFile = (path: string, name: string, content: string) => {
    const newFile: VFile = {
      name,
      path,
      content,
      createdAt: Date.now(),
    };
    setFiles((prev) => [...prev, newFile]);
    console.log(`[FS] Wrote file: ${path}/${name}`);
  };

  const moveFile = (fileName: string, fromPath: string, toPath: string) => {
    setFiles((prev) =>
      prev.map((f) => {
        if (f.name === fileName && f.path === fromPath) {
          console.log(`[FS] Moved file: ${fileName} from ${fromPath} to ${toPath}`);
          return { ...f, path: toPath };
        }
        return f;
      })
    );
  };

  const deleteFile = (fileName: string, atPath: string) => {
    setFiles((prev) => prev.filter((f) => !(f.name === fileName && f.path === atPath)));
    console.log(`[FS] Deleted file: ${atPath}/${fileName}`);
  };

  const listFiles = (path: string) => {
    return files.filter((f) => f.path === path);
  };

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
