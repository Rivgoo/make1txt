import type { Profile } from '@/core/types/file.types';

const DB_NAME = 'CodeGeneratorDB';
const DB_VERSION = 1;
const STORE_PROFILES = 'profiles';
const MAX_RETRIES = 3;

export class DatabaseService {
  private _db: IDBDatabase | null = null;
  private _connecting: Promise<void> | null = null;

  async connect(): Promise<void> {
    if (this._db) return;

    // Deduplicate concurrent connect() calls.
    if (this._connecting) return this._connecting;

    this._connecting = this._openDb().finally(() => {
      this._connecting = null;
    });

    return this._connecting;
  }

  private _openDb(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () =>
        reject(new Error('IndexedDB connection failed'));

      request.onsuccess = (event) => {
        this._db = (event.target as IDBOpenDBRequest).result;

        this._db.onclose = () => {
          this._db = null;
        };
        this._db.onerror = (ev) => {
          console.error('IndexedDB error', ev);
        };

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

  private async _withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await this.connect();
        return await operation();
      } catch (err) {
        lastError = err;
        // Force reconnect on next attempt.
        this._db = null;
        await new Promise<void>((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
      }
    }
    throw lastError;
  }

  saveProfile(profile: Profile): Promise<void> {
    return this._withRetry(
      () =>
        new Promise((resolve, reject) => {
          const tx = this._db!.transaction(STORE_PROFILES, 'readwrite');
          const req = tx.objectStore(STORE_PROFILES).put(profile);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(new Error('Failed to save profile'));
        }),
    );
  }

  getAllProfiles(): Promise<Profile[]> {
    return this._withRetry(
      () =>
        new Promise((resolve, reject) => {
          const tx = this._db!.transaction(STORE_PROFILES, 'readonly');
          const req = tx.objectStore(STORE_PROFILES).getAll();
          req.onsuccess = () => resolve(req.result as Profile[]);
          req.onerror = () => reject(new Error('Failed to load profiles'));
        }),
    );
  }

  deleteProfile(id: string): Promise<void> {
    return this._withRetry(
      () =>
        new Promise((resolve, reject) => {
          const tx = this._db!.transaction(STORE_PROFILES, 'readwrite');
          const req = tx.objectStore(STORE_PROFILES).delete(id);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(new Error('Failed to delete profile'));
        }),
    );
  }
}

export const dbService = new DatabaseService();