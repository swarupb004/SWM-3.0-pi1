import React, { useState, useEffect, useRef, useCallback } from 'react';
import './CaseDrawer.css';

const DEFAULT_SYNC_INTERVAL_MS = 5 * 60 * 1000;
const STATUS_REFRESH_INTERVAL_MS = 30 * 1000;

const CaseDrawer: React.FC = () => {
  const [currentCase, setCurrentCase] = useState<any>(null);
  const [caseNumber, setCaseNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [caseType, setCaseType] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [attendance, setAttendance] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [caseElapsed, setCaseElapsed] = useState<number>(0);
  const [loginElapsed, setLoginElapsed] = useState<number>(0);
  const [breakElapsed, setBreakElapsed] = useState<number>(0);
  const currentCaseRef = useRef<any>(null);

  const handleCloseCase = useCallback(async () => {
    const activeCase = currentCaseRef.current;
    if (!activeCase) return;

    setIsLoading(true);
    try {
      await window.electronAPI.closeCase(activeCase.id);
      setMessage('Case closed successfully!');
      setCurrentCase(null);
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurrentCase();
    loadAttendance();
    loadSyncStatus();

    // Listen for close case shortcut
    const removeListener = window.electronAPI.onCloseCase(() => {
      if (currentCaseRef.current) {
        handleCloseCase();
      }
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const refreshInterval = setInterval(() => {
      loadAttendance();
      loadSyncStatus();
    }, STATUS_REFRESH_INTERVAL_MS);

    return () => {
      removeListener();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(refreshInterval);
    };
  }, []);

  useEffect(() => {
    currentCaseRef.current = currentCase;
  }, [currentCase]);

  useEffect(() => {
    if (!currentCase) {
      setCaseElapsed(0);
      return;
    }

    const startValue = currentCase.booked_out_at || currentCase.created_at;
    if (!startValue) {
      setCaseElapsed(0);
      return;
    }

    const startTime = new Date(startValue).getTime();
    const updateElapsed = () => {
      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
      setCaseElapsed(elapsedSeconds);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [currentCase]);

  useEffect(() => {
    if (!attendance?.check_in) {
      setLoginElapsed(0);
      return;
    }

    const startTime = new Date(attendance.check_in).getTime();
    const updateElapsed = () => {
      const endTime = attendance.check_out
        ? new Date(attendance.check_out).getTime()
        : Date.now();
      const elapsedSeconds = Math.max(0, Math.floor((endTime - startTime) / 1000));
      setLoginElapsed(elapsedSeconds);
    };

    updateElapsed();
    if (!attendance.check_out) {
      const interval = setInterval(updateElapsed, 1000);
      return () => clearInterval(interval);
    }
  }, [attendance]);

  useEffect(() => {
    if (!attendance) {
      setBreakElapsed(0);
      return;
    }

    const baseBreakSeconds = (attendance.total_break_minutes || 0) * 60;
    if (!attendance.break_start || attendance.break_end) {
      setBreakElapsed(baseBreakSeconds);
      return;
    }

    const breakStart = new Date(attendance.break_start).getTime();
    const updateElapsed = () => {
      const extraSeconds = Math.max(0, Math.floor((Date.now() - breakStart) / 1000));
      setBreakElapsed(baseBreakSeconds + extraSeconds);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [attendance]);

  const loadCurrentCase = async () => {
    try {
      const caseData = await window.electronAPI.getCurrentCase();
      setCurrentCase(caseData);
    } catch (error) {
      console.error('Error loading current case:', error);
    }
  };

  const loadAttendance = async () => {
    try {
      const attendanceData = await window.electronAPI.getTodayAttendance();
      setAttendance(attendanceData);
    } catch (error) {
      console.error('Error loading attendance:', error);
    }
  };

  const loadSyncStatus = async () => {
    try {
      const status = await window.electronAPI.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Error loading sync status:', error);
    }
  };

  const handleStartCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const caseData = {
        case_number: caseNumber,
        customer_name: customerName,
        case_type: caseType,
        description: description,
        priority: 'medium',
        assigned_to: 1, // Current user
      };

      const result = await window.electronAPI.createCase(caseData);
      setCurrentCase(result);
      setMessage('Case started successfully!');
      
      // Clear form
      setCaseNumber('');
      setCustomerName('');
      setCaseType('');
      setDescription('');

      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCaseId = async () => {
    if (currentCase) {
      await window.electronAPI.copyToClipboard(currentCase.case_number);
      setMessage('Case ID copied!');
      setTimeout(() => setMessage(''), 2000);
    }
  };

  const handleMinimize = () => {
    window.electronAPI.minimizeWindow();
  };

  const handleClose = () => {
    window.electronAPI.closeWindow();
  };

  const handleReconcile = async () => {
    setIsLoading(true);
    setMessage('');
    try {
      const result = await window.electronAPI.downloadAllocatedCases();
      setMessage(result.message || 'Reconciliation completed');
      await loadCurrentCase();
      await loadSyncStatus();
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
  };

  const isOnBreak = Boolean(attendance?.break_start && !attendance?.break_end);
  const syncErrors: string[] = syncStatus?.lastSyncErrors || [];
  const conflictCount = syncErrors.filter((error) => {
    const normalized = error.toLowerCase();
    return normalized.includes('conflict') || normalized.includes('409');
  }).length;
  const syncIntervalMs = syncStatus?.syncIntervalMs ?? DEFAULT_SYNC_INTERVAL_MS;
  const lastSyncLabel = syncStatus?.lastSyncTime
    ? new Date(syncStatus.lastSyncTime).toLocaleTimeString()
    : 'Never';
  const nextSyncSeconds = syncStatus?.lastSyncTime
    ? Math.max(
        0,
        Math.floor(
          (syncIntervalMs - (Date.now() - new Date(syncStatus.lastSyncTime).getTime())) / 1000
        )
      )
    : Math.floor(syncIntervalMs / 1000);
  const syncStateLabel = syncStatus?.isSyncing
    ? 'Syncing'
    : !isOnline
    ? 'Offline'
    : syncStatus?.status === 'failed'
    ? 'Sync failed'
    : 'Synced';
  const syncStateClass = syncStatus?.isSyncing
    ? 'status-pill-warning'
    : !isOnline
    ? 'status-pill-danger'
    : syncStatus?.status === 'failed'
    ? 'status-pill-danger'
    : 'status-pill-success';

  return (
    <div className="case-drawer">
      <div className="drawer-header">
        <h3>Case Entry</h3>
        <div className="drawer-controls">
          <button className="control-btn" onClick={handleMinimize} title="Minimize">
            ─
          </button>
          <button className="control-btn" onClick={handleClose} title="Close">
            ✕
          </button>
        </div>
      </div>

      <div className="status-bar">
        <div className="status-item">
          <span className="status-label">Thread ID</span>
          <span className="status-value">{currentCase?.case_number || '—'}</span>
        </div>
        <div className="status-item">
          <span className="status-label">Case Timer</span>
          <span className="status-value">{formatDuration(caseElapsed)}</span>
        </div>
        <div className="status-item">
          <span className="status-label">Login Time</span>
          <span className="status-value">
            {attendance?.check_in ? formatDuration(loginElapsed) : 'Not checked in'}
          </span>
        </div>
        <div className="status-item">
          <span className="status-label">Break</span>
          <span className="status-value">
            {breakElapsed > 0 ? formatDuration(breakElapsed) : '—'}
          </span>
          {isOnBreak && <span className="status-sub">On break</span>}
        </div>
        <div className="status-item status-sync">
          <span className="status-label">Sync</span>
          <span className={`status-pill ${syncStateClass}`}>{syncStateLabel}</span>
          <span className="status-sub">Last: {lastSyncLabel}</span>
          <span className="status-sub">Next: {formatDuration(nextSyncSeconds)}</span>
          <span className="status-sub">Queue: {syncStatus?.queueSize ?? 0}</span>
        </div>
        {conflictCount > 0 && (
          <div className="status-item status-conflict">
            <span className="status-label">Conflicts</span>
            <span className="status-value">{conflictCount}</span>
            <button
              className="btn-mini"
              type="button"
              onClick={handleReconcile}
              disabled={isLoading}
            >
              Reconcile
            </button>
          </div>
        )}
      </div>

      <div className="drawer-content">
        {message && (
          <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}

        {currentCase ? (
          <div className="current-case">
            <h4>Active Case</h4>
            <div className="case-info">
              <div className="info-row">
                <span className="label">Case #:</span>
                <span className="value">{currentCase.case_number}</span>
                <button className="btn-copy" onClick={handleCopyCaseId} title="Copy Case ID">
                  📋
                </button>
              </div>
              <div className="info-row">
                <span className="label">Customer:</span>
                <span className="value">{currentCase.customer_name}</span>
              </div>
              <div className="info-row">
                <span className="label">Type:</span>
                <span className="value">{currentCase.case_type}</span>
              </div>
            </div>
            <button 
              className="btn-close-case" 
              onClick={handleCloseCase}
              disabled={isLoading}
            >
              {isLoading ? 'Closing...' : 'Close Case (E)'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleStartCase} className="case-form">
            <div className="form-group">
              <input
                type="text"
                placeholder="Case Number"
                value={caseNumber}
                onChange={(e) => setCaseNumber(e.target.value)}
                required
                className="form-input"
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                placeholder="Customer Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                className="form-input"
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                placeholder="Case Type"
                value={caseType}
                onChange={(e) => setCaseType(e.target.value)}
                required
                className="form-input"
              />
            </div>
            <div className="form-group">
              <textarea
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="form-textarea"
                rows={3}
              />
            </div>
            <button 
              type="submit" 
              className="btn-start-case"
              disabled={isLoading}
            >
              {isLoading ? 'Starting...' : 'Start Case'}
            </button>
          </form>
        )}
      </div>

      <div className="drawer-footer">
        <span className="shortcut-hint">
          Ctrl+Shift+C: Open | E: Close Case
        </span>
      </div>
    </div>
  );
};

export default CaseDrawer;
