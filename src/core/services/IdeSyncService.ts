import type { IdeSyncPayload } from '../types/file.types';

export class IdeSyncService {
  static async fetchContext(port: string, token: string): Promise<IdeSyncPayload> {
    const response = await fetch(`http://localhost:${port}/api/context`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('SYNC_FORBIDDEN');
      }
      throw new Error('SYNC_FAILED');
    }

    return await response.json();
  }
}