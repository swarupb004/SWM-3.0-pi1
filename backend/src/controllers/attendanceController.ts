import { Response } from 'express';
import { query } from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const checkIn = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    // Check if already checked in today
    const existing = await query(
      'SELECT id, check_out FROM attendance WHERE user_id = $1 AND date = $2',
      [userId, today]
    );

    if (existing.rows.length > 0 && !existing.rows[0].check_out) {
      return res.status(400).json({ error: 'Already checked in' });
    }

    // Create new attendance record
    const result = await query(
      'INSERT INTO attendance (user_id, check_in, date, status) VALUES ($1, NOW(), $2, $3) RETURNING *',
      [userId, today, 'active']
    );

    res.json({
      message: 'Checked in successfully',
      attendance: result.rows[0],
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const checkOut = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    // Find today's attendance record
    const existing = await query(
      'SELECT * FROM attendance WHERE user_id = $1 AND date = $2 AND check_out IS NULL',
      [userId, today]
    );

    if (existing.rows.length === 0) {
      return res.status(400).json({ error: 'Not checked in' });
    }

    const attendance = existing.rows[0];

    // Update with check-out time
    const result = await query(
      'UPDATE attendance SET check_out = NOW(), status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      ['completed', attendance.id]
    );

    res.json({
      message: 'Checked out successfully',
      attendance: result.rows[0],
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const startBreak = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    const existing = await query(
      'SELECT * FROM attendance WHERE user_id = $1 AND date = $2 AND check_out IS NULL',
      [userId, today]
    );

    if (existing.rows.length === 0) {
      return res.status(400).json({ error: 'Not checked in' });
    }

    const attendance = existing.rows[0];

    if (attendance.break_start && !attendance.break_end) {
      return res.status(400).json({ error: 'Break already started' });
    }

    const result = await query(
      'UPDATE attendance SET break_start = NOW(), status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      ['on_break', attendance.id]
    );

    res.json({
      message: 'Break started',
      attendance: result.rows[0],
    });
  } catch (error) {
    console.error('Start break error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const endBreak = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    const existing = await query(
      'SELECT * FROM attendance WHERE user_id = $1 AND date = $2 AND check_out IS NULL',
      [userId, today]
    );

    if (existing.rows.length === 0) {
      return res.status(400).json({ error: 'Not checked in' });
    }

    const attendance = existing.rows[0];

    if (!attendance.break_start) {
      return res.status(400).json({ error: 'Break not started' });
    }

    // Calculate break duration
    const breakStart = new Date(attendance.break_start);
    const breakEnd = new Date();
    const breakMinutes = Math.floor((breakEnd.getTime() - breakStart.getTime()) / 60000);

    const result = await query(
      'UPDATE attendance SET break_end = NOW(), total_break_minutes = total_break_minutes + $1, status = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [breakMinutes, 'active', attendance.id]
    );

    res.json({
      message: 'Break ended',
      attendance: result.rows[0],
    });
  } catch (error) {
    console.error('End break error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMyAttendance = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { startDate, endDate } = req.query;
    const userId = req.user.id;

    let queryText = 'SELECT * FROM attendance WHERE user_id = $1';
    const params: any[] = [userId];

    if (startDate) {
      queryText += ' AND date >= $2';
      params.push(startDate);
    }

    if (endDate) {
      queryText += ` AND date <= $${params.length + 1}`;
      params.push(endDate);
    }

    queryText += ' ORDER BY date DESC, check_in DESC';

    const result = await query(queryText, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTeamAttendance = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { startDate, endDate, team } = req.query;

    let queryText = `
      SELECT a.*, u.username, u.email, u.team
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (team) {
      queryText += ` AND u.team = $${params.length + 1}`;
      params.push(team);
    }

    if (startDate) {
      queryText += ` AND a.date >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      queryText += ` AND a.date <= $${params.length + 1}`;
      params.push(endDate);
    }

    queryText += ' ORDER BY a.date DESC, a.check_in DESC';

    const result = await query(queryText, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Get team attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTodayStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    const result = await query(
      'SELECT * FROM attendance WHERE user_id = $1 AND date = $2',
      [userId, today]
    );

    res.json(result.rows[0] || null);
  } catch (error) {
    console.error('Get today status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
