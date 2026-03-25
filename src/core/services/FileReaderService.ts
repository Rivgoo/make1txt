// src/core/services/FileReaderService.ts
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function readTextFromFileHandle(fileHandle: FileSystemFileHandle): Promise<string> {
  const file = await fileHandle.getFile();

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`Файл ${file.name} занадто великий для зчитування (> 5MB).`);
  }

  try {
    return await file.text();
  } catch {
    throw new Error(`Неможливо прочитати файл ${file.name} як текст. Можливо, він бінарний.`);
  }
}