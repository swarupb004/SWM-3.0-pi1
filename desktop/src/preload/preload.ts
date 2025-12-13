import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations
  dbQuery: (sql: string, params?: any[]) => ipcRenderer.invoke('db:query', sql, params),
  dbExecute: (sql: string, params?: any[]) => ipcRenderer.invoke('db:execute', sql, params),

  // Case operations
  createCase: (caseData: any) => ipcRenderer.invoke('case:create', caseData),
  updateCase: (id: number, caseData: any) => ipcRenderer.invoke('case:update', id, caseData),
  closeCase: (id: number) => ipcRenderer.invoke('case:close', id),
  getCurrentCase: () => ipcRenderer.invoke('case:getCurrent'),
  
  // Book out operations
  bookOutCase: (id: number, userId: number) => ipcRenderer.invoke('case:bookOut', id, userId),
  releaseCase: (id: number, userId: number) => ipcRenderer.invoke('case:release', id, userId),
  getAllocatedCases: (userId: number) => ipcRenderer.invoke('case:getAllocated', userId),
  importCasesFromServer: () => ipcRenderer.invoke('case:importFromServer'),

  // Attendance operations
  checkIn: () => ipcRenderer.invoke('attendance:checkIn'),
  checkOut: () => ipcRenderer.invoke('attendance:checkOut'),

  // Sync operations
  syncNow: () => ipcRenderer.invoke('sync:now'),
  getSyncStatus: () => ipcRenderer.invoke('sync:status'),
  downloadAllocatedCases: () => ipcRenderer.invoke('sync:downloadCases'),

  // Settings
  getSetting: (key: string) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key: string, value: any) => ipcRenderer.invoke('settings:set', key, value),

  // Clipboard
  copyToClipboard: (text: string) => ipcRenderer.invoke('clipboard:write', text),

  // Window operations
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  toggleDrawer: () => ipcRenderer.invoke('window:toggleDrawer'),

  // Listeners
  onCloseCase: (callback: () => void) => {
    ipcRenderer.on('close-case', callback);
    return () => ipcRenderer.removeListener('close-case', callback);
  }
});

// Type definitions for TypeScript
declare global {
  interface Window {
    electronAPI: {
      dbQuery: (sql: string, params?: any[]) => Promise<any[]>;
      dbExecute: (sql: string, params?: any[]) => Promise<any>;
      createCase: (caseData: any) => Promise<any>;
      updateCase: (id: number, caseData: any) => Promise<any>;
      closeCase: (id: number) => Promise<any>;
      getCurrentCase: () => Promise<any>;
      bookOutCase: (id: number, userId: number) => Promise<{ success: boolean; conflict?: boolean; message: string; action_required?: string }>;
      releaseCase: (id: number, userId: number) => Promise<any>;
      getAllocatedCases: (userId: number) => Promise<{ total: number; available: number; booked_out: number; cases: any[]; available_cases: any[]; booked_out_cases: any[] }>;
      importCasesFromServer: () => Promise<{ success: boolean; message: string; imported?: number; updated?: number; conflicts?: any[] }>;
      checkIn: () => Promise<any>;
      checkOut: () => Promise<any>;
      syncNow: () => Promise<{ success: boolean; message: string }>;
      getSyncStatus: () => Promise<any>;
      downloadAllocatedCases: () => Promise<{ success: boolean; message: string; imported?: number; updated?: number; conflicts?: any[] }>;
      getSetting: (key: string) => Promise<any>;
      setSetting: (key: string, value: any) => Promise<boolean>;
      copyToClipboard: (text: string) => Promise<boolean>;
      minimizeWindow: () => Promise<void>;
      closeWindow: () => Promise<void>;
      toggleDrawer: () => Promise<void>;
      onCloseCase: (callback: () => void) => () => void;
    };
  }
}
