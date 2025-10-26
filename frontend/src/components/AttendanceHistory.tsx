import React, { useState, useEffect } from 'react';
import Navigation from './Navigation';
import { attendanceApi } from '../services/api';
import { format } from 'date-fns';
import type { Attendance } from '../types';

const AttendanceHistory: React.FC = () => {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    loadAttendance();
  }, [dateRange]);

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const data = await attendanceApi.getMyAttendance(dateRange);
      setAttendance(data);
    } catch (err) {
      console.error('Error loading attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string | undefined) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'HH:mm:ss');
  };

  const calculateHours = (checkIn: string, checkOut: string | undefined) => {
    if (!checkOut) return 'In Progress';
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      active: 'badge-success',
      on_break: 'badge-warning',
      completed: 'badge-secondary',
    };
    return badges[status] || 'badge-secondary';
  };

  return (
    <>
      <Navigation />
      <div className="container mt-8">
        <h1>My Attendance History</h1>

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

export default AttendanceHistory;
