import React, { useState, useEffect } from 'react';
import Navigation from './Navigation';
import { attendanceApi } from '../services/api';
import { format } from 'date-fns';
import type { Attendance } from '../types';

const TeamDashboard: React.FC = () => {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    loadTeamAttendance();
  }, [dateRange]);

  const loadTeamAttendance = async () => {
    setLoading(true);
    try {
      const data = await attendanceApi.getTeamAttendance(dateRange);
      setAttendance(data);
    } catch (err) {
      console.error('Error loading team attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      active: 'badge-success',
      on_break: 'badge-warning',
      completed: 'badge-secondary',
    };
    return badges[status] || 'badge-secondary';
  };

  const formatTime = (dateString: string | undefined) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'HH:mm:ss');
  };

  const calculateHours = (checkIn: string, checkOut: string | undefined) => {
    if (!checkOut) return '-';
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <>
      <Navigation />
      <div className="container mt-8">
        <h1>Team Dashboard</h1>

        <div className="card mb-4">
          <div className="grid grid-cols-2">
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-input"
                value={dateRange.startDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, startDate: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label">End Date</label>
              <input
                type="date"
                className="form-input"
                value={dateRange.endDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, endDate: e.target.value })
                }
              />
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Team Attendance</h2>

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="spinner"></div>
            </div>
          ) : attendance.length === 0 ? (
            <p className="text-secondary text-center p-4">
              No attendance records found for the selected date range.
            </p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Employee</th>
                  <th>Team</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Break Time</th>
                  <th>Total Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((record) => (
                  <tr key={record.id}>
                    <td>{format(new Date(record.date), 'yyyy-MM-dd')}</td>
                    <td>
                      <div className="font-semibold">{record.username}</div>
                      <div className="text-sm text-secondary">{record.email}</div>
                    </td>
                    <td>{record.team || '-'}</td>
                    <td>{formatTime(record.check_in)}</td>
                    <td>{formatTime(record.check_out)}</td>
                    <td>{record.total_break_minutes} min</td>
                    <td>{calculateHours(record.check_in, record.check_out)}</td>
                    <td>
                      <span className={`badge ${getStatusBadge(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
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

export default TeamDashboard;
