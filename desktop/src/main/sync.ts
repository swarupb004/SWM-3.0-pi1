import { DatabaseManager } from './database';
import axios from 'axios';

export class SyncManager {
  private dbManager: DatabaseManager;
  private syncInterval: NodeJS.Timeout | null = null;
  private syncQueue: Map<string, Set<number>> = new Map();
  private isSyncing = false;
  private lastSyncTime: Date | null = null;
  private lastSyncStatus: 'success' | 'failed' | 'pending' = 'pending';

  // Server configuration - can be updated from settings
  private serverUrl: string = 'http://localhost:3000/api';
  private authToken: string | null = null;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
  }

  setServerConfig(url: string, token: string) {
    this.serverUrl = url;
    this.authToken = token;
  }

  startPeriodicSync(intervalMs: number) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      this.syncNow();
    }, intervalMs);

    // Do initial sync
    this.syncNow();
  }

  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  queueSync(tableName: string, recordId: number) {
    if (!this.syncQueue.has(tableName)) {
      this.syncQueue.set(tableName, new Set());
    }
    this.syncQueue.get(tableName)!.add(recordId);
  }

  async syncNow(): Promise<{ success: boolean; message: string }> {
    if (this.isSyncing) {
      return { success: false, message: 'Sync already in progress' };
    }

    this.isSyncing = true;
    const startTime = Date.now();

    try {
      // Check server connectivity
      if (!this.authToken) {
        throw new Error('Not authenticated with server');
      }

      // Sync each table
      const tables = ['cases', 'attendance', 'case_history'];
      const results = {
        synced: 0,
        failed: 0,
        errors: [] as string[]
      };

      for (const table of tables) {
        try {
          const unsynced = this.dbManager.getUnsyncedRecords(table, 50);
          
          for (const record of unsynced) {
            try {
              await this.syncRecord(table, record);
              results.synced++;
            } catch (error: any) {
              results.failed++;
              results.errors.push(`${table}#${record.id}: ${error.message}`);
            }
          }
        } catch (error: any) {
          results.errors.push(`Table ${table}: ${error.message}`);
        }
      }

      this.lastSyncTime = new Date();
      this.lastSyncStatus = results.failed === 0 ? 'success' : 'failed';

      const duration = Date.now() - startTime;
      console.log(`Sync completed in ${duration}ms:`, results);

      return {
        success: results.failed === 0,
        message: `Synced ${results.synced} records, ${results.failed} failed`
      };
    } catch (error: any) {
      console.error('Sync error:', error);
      this.lastSyncStatus = 'failed';
      return { success: false, message: error.message };
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncRecord(tableName: string, record: any) {
    const headers = {
      'Authorization': `Bearer ${this.authToken}`,
      'Content-Type': 'application/json'
    };

    let endpoint = '';
    let method = 'POST';
    let data = { ...record };

    // Remove local fields
    delete data.id;
    delete data.server_id;
    delete data.synced;

    switch (tableName) {
      case 'cases':
        if (record.server_id) {
          endpoint = `/cases/${record.server_id}`;
          method = 'PUT';
        } else {
          endpoint = '/cases';
          method = 'POST';
        }
        break;

      case 'attendance':
        if (record.server_id) {
          endpoint = `/attendance/${record.server_id}`;
          method = 'PUT';
        } else {
          endpoint = '/attendance/check-in';
          method = 'POST';
        }
        break;

      case 'case_history':
        endpoint = `/cases/${record.case_id}/history`;
        method = 'POST';
        break;
    }

    try {
      const response = await axios({
        method,
        url: `${this.serverUrl}${endpoint}`,
        headers,
        data,
        timeout: 10000
      });

      // Mark as synced
      const serverId = response.data.id || record.server_id;
      this.dbManager.markAsSynced(tableName, record.id, serverId);

      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(`Server error: ${error.response.status} - ${error.response.data?.error || error.message}`);
      } else if (error.request) {
        throw new Error('No response from server - offline?');
      } else {
        throw error;
      }
    }
  }

  getStatus() {
    return {
      lastSyncTime: this.lastSyncTime,
      status: this.lastSyncStatus,
      isSyncing: this.isSyncing,
      queueSize: Array.from(this.syncQueue.values()).reduce((sum, set) => sum + set.size, 0)
    };
  }

  // Download data from server to local (for initial setup or recovery)
  async downloadFromServer() {
    if (!this.authToken) {
      throw new Error('Not authenticated with server');
    }

    const headers = {
      'Authorization': `Bearer ${this.authToken}`,
      'Content-Type': 'application/json'
    };

    try {
      // Download cases
      const casesResponse = await axios.get(`${this.serverUrl}/cases`, { headers });
      const cases = casesResponse.data;

      for (const caseData of cases) {
        // Check if exists locally
        const existing = this.dbManager.query(
          'SELECT id FROM cases WHERE server_id = ?',
          [caseData.id]
        );

        if (existing.length === 0) {
          // Insert new
          this.dbManager.execute(`
            INSERT INTO cases (case_number, customer_name, customer_email, customer_phone,
                              case_type, priority, status, description, server_id, synced)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
          `, [
            caseData.case_number,
            caseData.customer_name,
            caseData.customer_email,
            caseData.customer_phone,
            caseData.case_type,
            caseData.priority,
            caseData.status,
            caseData.description,
            caseData.id
          ]);
        }
      }

      // Download attendance
      const attendanceResponse = await axios.get(`${this.serverUrl}/attendance/my-attendance`, { headers });
      const attendance = attendanceResponse.data;

      for (const record of attendance) {
        const existing = this.dbManager.query(
          'SELECT id FROM attendance WHERE server_id = ?',
          [record.id]
        );

        if (existing.length === 0) {
          this.dbManager.execute(`
            INSERT INTO attendance (user_id, check_in, check_out, date, status, server_id, synced)
            VALUES (?, ?, ?, ?, ?, ?, 1)
          `, [
            record.user_id,
            record.check_in,
            record.check_out,
            record.date,
            record.status,
            record.id
          ]);
        }
      }

      console.log('Downloaded data from server successfully');
      return { success: true, message: 'Data downloaded successfully' };
    } catch (error: any) {
      console.error('Download error:', error);
      throw error;
    }
  }
}
