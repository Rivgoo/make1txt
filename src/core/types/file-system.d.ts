export {};

declare global {
  interface FileSystemHandlePermissionDescriptor {
    mode?: 'read' | 'readwrite';
  }

  interface FileSystemHandle {
    readonly kind: 'file' | 'directory';
    readonly name: string;
    isSameEntry(other: FileSystemHandle): Promise<boolean>;
    queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
    requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  }

  interface FileSystemWritableFileStream extends WritableStream {
    write(data: Blob | BufferSource | string): Promise<void>;
    close(): Promise<void>;
  }

  interface FileSystemFileHandle extends FileSystemHandle {
    readonly kind: 'file';
    getFile(): Promise<File>;
    createWritable(): Promise<FileSystemWritableFileStream>;
  }

  interface FileSystemDirectoryHandle extends FileSystemHandle {
    readonly kind: 'directory';
    values(): AsyncIterableIterator<FileSystemHandle>;
    getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
  }

  interface SaveFilePickerOptions {
    suggestedName?: string;
    types?: Array<{
      description?: string;
      accept: Record<string, string[]>;
    }>;
  }

  interface Window {
    showDirectoryPicker(options?: {
      id?: string;
      mode?: 'read' | 'readwrite';
      startIn?: FileSystemHandle | string;
    }): Promise<FileSystemDirectoryHandle>;
    
    showSaveFilePicker(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>;
  }
}