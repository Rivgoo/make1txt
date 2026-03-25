// src/core/services/DatabaseService.ts
import type { Profile } from '@/core/types/file.types';

const DB_NAME = 'CodeGeneratorDB';
const DB_VERSION = 1;
const STORE_PROFILES = 'profiles';

export class DatabaseService {
  private db: IDBDatabase | null = null;

  public async connect(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(new Error('Помилка підключення до IndexedDB'));

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_PROFILES)) {
          db.createObjectStore(STORE_PROFILES, { keyPath: 'id' });
        }
      };
    });
  }

  public async saveProfile(profile: Profile): Promise<void> {
    await this.connect();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_PROFILES, 'readwrite');
      const store = transaction.objectStore(STORE_PROFILES);
      const request = store.put(profile);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Не вдалося зберегти профіль'));
    });
  }

  public async getAllProfiles(): Promise<Profile[]> {
    await this.connect();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_PROFILES, 'readonly');
      const store = transaction.objectStore(STORE_PROFILES);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Не вдалося завантажити профілі'));
    });
  }

  public async deleteProfile(id: string): Promise<void> {
    await this.connect();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_PROFILES, 'readwrite');
      const store = transaction.objectStore(STORE_PROFILES);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Не вдалося видалити профіль'));
    });
  }
}

export const dbService = new DatabaseService();