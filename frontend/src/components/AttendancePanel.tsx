import React, { useState, useEffect } from 'react';
import { attendanceApi } from '../services/api';
import { useTimer } from '../hooks/useTimer';
import type { Attendance } from '../types';

const AttendancePanel: React.FC = () => {
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  const timer = useTimer({
    startTime: attendance?.check_in,
    autoStart: !!attendance && !attendance.check_out,
  });

  useEffect(() => {
    loadTodayStatus();
  }, []);

  const loadTodayStatus = async () => {
    try {
      const data = await attendanceApi.getTodayStatus();
      setAttendance(data);
    } catch (err: any) {
      console.error('Error loading attendance:', err);
    }
  };

  const handleCheckIn = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await attendanceApi.checkIn();
      setAttendance(response.attendance);
      setMessage('Checked in successfully!');
      timer.start();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to check in');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await attendanceApi.checkOut();
      setAttendance(response.attendance);
      setMessage('Checked out successfully!');
      timer.stop();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to check out');
    } finally {
      setLoading(false);
    }
  };

  const handleStartBreak = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await attendanceApi.startBreak();
      setAttendance(response.attendance);
      setMessage('Break started');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start break');
    } finally {
      setLoading(false);
    }
  };

  const handleEndBreak = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await attendanceApi.endBreak();
      setAttendance(response.attendance);
      setMessage('Break ended');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to end break');
    } finally {
      setLoading(false);
    }
  };

  const isCheckedIn = attendance && !attendance.check_out;
  const isOnBreak = attendance?.status === 'on_break';

  return (
    <div className="card">
      <h2>Attendance Panel</h2>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold">Status:</span>
          {isCheckedIn ? (
            <span className="badge badge-success">
              {isOnBreak ? 'On Break' : 'Active'}
            </span>
          ) : (
            <span className="badge badge-secondary">Not Checked In</span>
          )}
        </div>

        {isCheckedIn && (
          <>
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold">Time Elapsed:</span>
              <span className="text-lg font-bold">{timer.formattedTime}</span>
            </div>

            {attendance && attendance.total_break_minutes > 0 && (
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total Break:</span>
                <span>{attendance.total_break_minutes} minutes</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex gap-2">
        {!isCheckedIn ? (
          <button
            className="btn btn-success"
            onClick={handleCheckIn}
            disabled={loading}
          >
            Check In
          </button>
        ) : (
          <>
            <button
              className="btn btn-danger"
              onClick={handleCheckOut}
              disabled={loading || isOnBreak}
            >
              Check Out
            </button>

            {!isOnBreak ? (
              <button
                className="btn btn-warning"
                onClick={handleStartBreak}
                disabled={loading}
              >
                Start Break
              </button>
            ) : (
              <button
                className="btn btn-success"
                onClick={handleEndBreak}
                disabled={loading}
              >
                End Break
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AttendancePanel;
