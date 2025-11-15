import React, { useState, useEffect } from 'react';
import './CaseDrawer.css';

const CaseDrawer: React.FC = () => {
  const [currentCase, setCurrentCase] = useState<any>(null);
  const [caseNumber, setCaseNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [caseType, setCaseType] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadCurrentCase();

    // Listen for close case shortcut
    const removeListener = window.electronAPI.onCloseCase(() => {
      if (currentCase) {
        handleCloseCase();
      }
    });

    return () => removeListener();
  }, []);

  const loadCurrentCase = async () => {
    try {
      const caseData = await window.electronAPI.getCurrentCase();
      setCurrentCase(caseData);
    } catch (error) {
      console.error('Error loading current case:', error);
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

  const handleCloseCase = async () => {
    if (!currentCase) return;

    setIsLoading(true);
    try {
      await window.electronAPI.closeCase(currentCase.id);
      setMessage('Case closed successfully!');
      setCurrentCase(null);
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
