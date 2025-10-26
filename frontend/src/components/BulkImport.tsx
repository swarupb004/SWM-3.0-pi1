import React, { useState } from 'react';
import Navigation from './Navigation';
import { importApi } from '../services/api';
import type { ImportResult } from '../types';

const BulkImport: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setError('');
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await importApi.importCases(file);
      setResult(response.results);
      setFile(null);
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err: any) {
      setError(err.response?.data?.error || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await importApi.getTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'case_import_template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading template:', err);
    }
  };

  const handleExportCases = async () => {
    try {
      const blob = await importApi.exportCases();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cases_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error exporting cases:', err);
    }
  };

  return (
    <>
      <Navigation />
      <div className="container mt-8">
        <h1>Bulk Import/Export</h1>

        <div className="grid grid-cols-2">
          <div className="card">
            <h2>Import Cases from CSV</h2>

            <div className="mb-4">
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleDownloadTemplate}
              >
                Download CSV Template
              </button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleImport}>
              <div className="form-group">
                <label className="form-label">Select CSV File</label>
                <input
                  id="file-input"
                  type="file"
                  className="form-input"
                  accept=".csv"
                  onChange={handleFileChange}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={!file || loading}
              >
                {loading ? 'Importing...' : 'Import Cases'}
              </button>
            </form>

            {result && (
              <div className="mt-4">
                <div className="alert alert-success">
                  <strong>Import completed!</strong>
                  <div className="mt-2">
                    <div>✓ Successfully imported: {result.success} cases</div>
                    {result.failed > 0 && (
                      <div className="text-danger">✗ Failed: {result.failed} cases</div>
                    )}
                  </div>
                </div>

                {result.errors.length > 0 && (
                  <div className="mt-4">
                    <h3>Errors</h3>
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Row</th>
                            <th>Error</th>
                            <th>Data</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.errors.map((err, idx) => (
                            <tr key={idx}>
                              <td>{err.row}</td>
                              <td className="text-danger">{err.error}</td>
                              <td className="text-sm">
                                {JSON.stringify(err.data).substring(0, 50)}...
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="card">
            <h2>Export Cases to CSV</h2>

            <p className="text-secondary mb-4">
              Export all cases to a CSV file for reporting or backup purposes.
            </p>

            <button className="btn btn-primary" onClick={handleExportCases}>
              Export All Cases
            </button>

            <div className="mt-4">
              <h3>CSV Format</h3>
              <p className="text-sm text-secondary">
                The CSV file will include the following columns:
              </p>
              <ul className="text-sm text-secondary" style={{ paddingLeft: '1.5rem' }}>
                <li>case_number</li>
                <li>customer_name</li>
                <li>customer_email</li>
                <li>customer_phone</li>
                <li>case_type</li>
                <li>priority</li>
                <li>status</li>
                <li>description</li>
                <li>created_at</li>
                <li>resolved_at</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BulkImport;
