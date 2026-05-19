import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface OfflineOperation extends Record<string, any> {
  id: string;
  type: 'add' | 'update' | 'delete' | 'complete' | 'addTime';
  collection: string;
  docId: string;
  data: any;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

interface OfflineDB extends DBSchema {
  operations: {
    key: string;
    value: OfflineOperation;
  };
  syncQueue: {
    key: string;
    value: {
      taskId: string;
      timestamp: number;
    };
  };
}

const DB_NAME = 'pomoji-offline';
const DB_VERSION = 1;

class OfflineManager {
  private db: IDBPDatabase<OfflineDB> | null = null;
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private syncCallbacks: Map<string, (operation: OfflineOperation) => Promise<void>> = new Map();

  async initialize(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      this.db = await openDB<OfflineDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('operations')) {
            db.createObjectStore('operations', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('syncQueue')) {
            db.createObjectStore('syncQueue', { keyPath: 'taskId' });
          }
        },
      });

      console.log('✓ Offline manager initialized');

      this.setupNetworkListeners();
    } catch (error) {
      console.error('Failed to initialize offline manager:', error);
    }
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('✓ Online - syncing offline operations');
      this.syncPendingOperations();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('⚠ Offline - queueing operations');
    });
  }

  async queueOperation(operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'retries'>): Promise<string> {
    if (!this.db) {
      throw new Error('Offline manager not initialized');
    }

    const id = `${operation.collection}-${operation.docId}-${Date.now()}`;
    const fullOperation: OfflineOperation = {
      id,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: 3,
      ...operation,
    };

    try {
      await this.db.add('operations', fullOperation);
      console.log(`✓ Operation queued: ${id}`);
      return id;
    } catch (error) {
      console.error('Failed to queue operation:', error);
      throw error;
    }
  }

  async getPendingOperations(): Promise<OfflineOperation[]> {
    if (!this.db) return [];

    try {
      return await this.db.getAll('operations');
    } catch (error) {
      console.error('Failed to get pending operations:', error);
      return [];
    }
  }

  async removeOperation(id: string): Promise<void> {
    if (!this.db) return;

    try {
      await this.db.delete('operations', id);
    } catch (error) {
      console.error('Failed to remove operation:', error);
    }
  }

  async updateOperation(id: string, updates: Partial<OfflineOperation>): Promise<void> {
    if (!this.db) return;

    try {
      const operation = await this.db.get('operations', id);
      if (operation) {
        await this.db.put('operations', { ...operation, ...updates });
      }
    } catch (error) {
      console.error('Failed to update operation:', error);
    }
  }

  async syncPendingOperations(): Promise<void> {
    if (!this.isOnline || !this.db) return;

    const operations = await this.getPendingOperations();
    console.log(`Syncing ${operations.length} pending operations...`);

    for (const operation of operations) {
      try {
        const callback = this.syncCallbacks.get(operation.type);
        if (callback) {
          await callback(operation);
          await this.removeOperation(operation.id);
          console.log(`✓ Synced: ${operation.id}`);
        } else {
          console.warn(`No sync callback for operation type: ${operation.type}`);
        }
      } catch (error) {
        console.error(`Failed to sync operation ${operation.id}:`, error);

        if (operation.retries < operation.maxRetries) {
          await this.updateOperation(operation.id, {
            retries: operation.retries + 1,
          });
        } else {
          console.error(`Max retries exceeded for operation ${operation.id}`);
          await this.removeOperation(operation.id);
        }
      }
    }
  }

  registerSyncCallback(
    operationType: OfflineOperation['type'],
    callback: (operation: OfflineOperation) => Promise<void>
  ): void {
    this.syncCallbacks.set(operationType, callback);
  }

  isConnected(): boolean {
    return this.isOnline;
  }

  async clearAll(): Promise<void> {
    if (!this.db) return;

    try {
      await this.db.clear('operations');
      await this.db.clear('syncQueue');
      console.log('✓ Offline cache cleared');
    } catch (error) {
      console.error('Failed to clear offline cache:', error);
    }
  }
}

// Export singleton instance
export const offlineManager = new OfflineManager();

// Initialize on import
if (typeof window !== 'undefined') {
  offlineManager.initialize().catch(console.error);
}
