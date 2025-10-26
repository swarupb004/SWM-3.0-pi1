import React, { useState, useEffect } from 'react';
import Navigation from './Navigation';
import { casesApi, attendanceApi } from '../services/api';
import type { CaseStats } from '../types';

const Reports: React.FC = () => {
  const [caseStats, setCaseStats] = useState<CaseStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const stats = await casesApi.getCaseStats();
      setCaseStats(stats);
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="container mt-8">
          <div className="flex items-center justify-center p-8">
            <div className="spinner"></div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="container mt-8">
        <h1>Reports & Analytics</h1>

        <div className="grid grid-cols-3 mb-8">
          <div className="card">
            <h3 className="text-secondary mb-2">Total Cases</h3>
            <div className="text-xl font-bold">{caseStats?.total_cases || 0}</div>
          </div>

          <div className="card">
            <h3 className="text-secondary mb-2">Open Cases</h3>
            <div className="text-xl font-bold text-info">{caseStats?.open_cases || 0}</div>
          </div>

          <div className="card">
            <h3 className="text-secondary mb-2">Resolved Cases</h3>
            <div className="text-xl font-bold text-success">
              {caseStats?.resolved_cases || 0}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2">
          <div className="card">
            <h2>Case Status Distribution</h2>
            <div className="grid" style={{ gap: '1rem' }}>
              <div className="flex justify-between items-center p-4" style={{ background: 'var(--background)' }}>
                <span className="font-semibold">Open</span>
                <div className="flex items-center gap-2">
                  <span className="badge badge-info">{caseStats?.open_cases || 0}</span>
                  <span className="text-secondary">
                    {caseStats?.total_cases
                      ? Math.round(
                          ((caseStats.open_cases / caseStats.total_cases) * 100)
                        )
                      : 0}
                    %
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center p-4" style={{ background: 'var(--background)' }}>
                <span className="font-semibold">In Progress</span>
                <div className="flex items-center gap-2">
                  <span className="badge badge-warning">
                    {caseStats?.in_progress_cases || 0}
                  </span>
                  <span className="text-secondary">
                    {caseStats?.total_cases
                      ? Math.round(
                          ((caseStats.in_progress_cases / caseStats.total_cases) * 100)
                        )
                      : 0}
                    %
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center p-4" style={{ background: 'var(--background)' }}>
                <span className="font-semibold">Resolved</span>
                <div className="flex items-center gap-2">
                  <span className="badge badge-success">
                    {caseStats?.resolved_cases || 0}
                  </span>
                  <span className="text-secondary">
                    {caseStats?.total_cases
                      ? Math.round(
                          ((caseStats.resolved_cases / caseStats.total_cases) * 100)
                        )
                      : 0}
                    %
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center p-4" style={{ background: 'var(--background)' }}>
                <span className="font-semibold">Closed</span>
                <div className="flex items-center gap-2">
                  <span className="badge badge-secondary">
                    {caseStats?.closed_cases || 0}
                  </span>
                  <span className="text-secondary">
                    {caseStats?.total_cases
                      ? Math.round(
                          ((caseStats.closed_cases / caseStats.total_cases) * 100)
                        )
                      : 0}
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h2>Priority Distribution</h2>
            <div className="grid" style={{ gap: '1rem' }}>
              <div className="flex justify-between items-center p-4" style={{ background: 'var(--background)' }}>
                <span className="font-semibold">High Priority</span>
                <div className="flex items-center gap-2">
                  <span className="badge badge-danger">{caseStats?.high_priority || 0}</span>
                  <span className="text-secondary">
                    {caseStats?.total_cases
                      ? Math.round(
                          ((caseStats.high_priority / caseStats.total_cases) * 100)
                        )
                      : 0}
                    %
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center p-4" style={{ background: 'var(--background)' }}>
                <span className="font-semibold">Medium Priority</span>
                <div className="flex items-center gap-2">
                  <span className="badge badge-warning">
                    {caseStats?.medium_priority || 0}
                  </span>
                  <span className="text-secondary">
                    {caseStats?.total_cases
                      ? Math.round(
                          ((caseStats.medium_priority / caseStats.total_cases) * 100)
                        )
                      : 0}
                    %
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center p-4" style={{ background: 'var(--background)' }}>
                <span className="font-semibold">Low Priority</span>
                <div className="flex items-center gap-2">
                  <span className="badge badge-success">{caseStats?.low_priority || 0}</span>
                  <span className="text-secondary">
                    {caseStats?.total_cases
                      ? Math.round(
                          ((caseStats.low_priority / caseStats.total_cases) * 100)
                        )
                      : 0}
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Reports;
