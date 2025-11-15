import React, { useState, useEffect } from 'react';
import Navigation from './Navigation';
import AttendancePanel from './AttendancePanel';
import { casesApi } from '../services/api';
import type { CaseStats, Case } from '../types';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<CaseStats | null>(null);
  const [recentCases, setRecentCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsData, casesData] = await Promise.all([
        casesApi.getCaseStats(),
        casesApi.getMyCases(),
      ]);

      setStats(statsData);
      setRecentCases(casesData.slice(0, 5));
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      open: 'badge-info',
      in_progress: 'badge-warning',
      resolved: 'badge-success',
      closed: 'badge-secondary',
    };
    return badges[status] || 'badge-secondary';
  };

  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, string> = {
      high: 'badge-danger',
      medium: 'badge-warning',
      low: 'badge-success',
    };
    return badges[priority] || 'badge-secondary';
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
        <h1>Dashboard</h1>

        <div className="grid grid-cols-2 mb-8">
          <AttendancePanel />

          {stats && (
            <div className="card">
              <h2>Case Statistics</h2>
              <div className="grid" style={{ gap: '0.75rem' }}>
                <div className="flex justify-between">
                  <span className="text-secondary">Total Cases:</span>
                  <span className="font-semibold">{stats.total_cases}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Open:</span>
                  <span className="font-semibold text-info">{stats.open_cases}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">In Progress:</span>
                  <span className="font-semibold text-warning">{stats.in_progress_cases}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Resolved:</span>
                  <span className="font-semibold text-success">{stats.resolved_cases}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">High Priority:</span>
                  <span className="font-semibold text-danger">{stats.high_priority}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h2>My Recent Cases</h2>
          {recentCases.length === 0 ? (
            <p className="text-secondary">No cases assigned to you yet.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Case Number</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {recentCases.map((c) => (
                  <tr key={c.id}>
                    <td className="font-semibold">{c.case_number}</td>
                    <td>{c.customer_name}</td>
                    <td>{c.case_type}</td>
                    <td>
                      <span className={`badge ${getPriorityBadge(c.priority)}`}>
                        {c.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadge(c.status)}`}>
                        {c.status}
                      </span>
                    </td>
                    <td>{new Date(c.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
};

export default Dashboard;
