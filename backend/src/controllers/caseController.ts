import { Response } from 'express';
import { query } from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const createCase = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const {
      case_number,
      customer_name,
      customer_email,
      customer_phone,
      case_type,
      priority = 'medium',
      description,
      assigned_to,
    } = req.body;

    if (!case_number || !customer_name || !case_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await query(
      `INSERT INTO cases 
       (case_number, customer_name, customer_email, customer_phone, case_type, priority, description, assigned_to, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        case_number,
        customer_name,
        customer_email,
        customer_phone,
        case_type,
        priority,
        description,
        assigned_to || req.user.id,
        'open',
      ]
    );

    // Add to case history
    await query(
      'INSERT INTO case_history (case_id, user_id, action, notes) VALUES ($1, $2, $3, $4)',
      [result.rows[0].id, req.user.id, 'Case created', description]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Create case error:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Case number already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCases = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { status, priority, assigned_to, case_type, search } = req.query;

    let queryText = `
      SELECT c.*, u.username as assigned_to_name
      FROM cases c
      LEFT JOIN users u ON c.assigned_to = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      queryText += ` AND c.status = $${params.length + 1}`;
      params.push(status);
    }

    if (priority) {
      queryText += ` AND c.priority = $${params.length + 1}`;
      params.push(priority);
    }

    if (assigned_to) {
      queryText += ` AND c.assigned_to = $${params.length + 1}`;
      params.push(assigned_to);
    }

    if (case_type) {
      queryText += ` AND c.case_type = $${params.length + 1}`;
      params.push(case_type);
    }

    if (search) {
      queryText += ` AND (c.case_number ILIKE $${params.length + 1} OR c.customer_name ILIKE $${params.length + 1} OR c.customer_email ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    queryText += ' ORDER BY c.created_at DESC';

    const result = await query(queryText, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Get cases error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCase = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { id } = req.params;

    const result = await query(
      `SELECT c.*, u.username as assigned_to_name
       FROM cases c
       LEFT JOIN users u ON c.assigned_to = u.id
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get case error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateCase = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { id } = req.params;
    const {
      customer_name,
      customer_email,
      customer_phone,
      case_type,
      priority,
      status,
      description,
      assigned_to,
      resolution,
    } = req.body;

    // Get current case
    const currentCase = await query('SELECT * FROM cases WHERE id = $1', [id]);

    if (currentCase.rows.length === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (customer_name !== undefined) {
      updates.push(`customer_name = $${paramIndex++}`);
      params.push(customer_name);
    }
    if (customer_email !== undefined) {
      updates.push(`customer_email = $${paramIndex++}`);
      params.push(customer_email);
    }
    if (customer_phone !== undefined) {
      updates.push(`customer_phone = $${paramIndex++}`);
      params.push(customer_phone);
    }
    if (case_type !== undefined) {
      updates.push(`case_type = $${paramIndex++}`);
      params.push(case_type);
    }
    if (priority !== undefined) {
      updates.push(`priority = $${paramIndex++}`);
      params.push(priority);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(status);
      if (status === 'resolved' || status === 'closed') {
        updates.push(`resolved_at = NOW()`);
      }
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(description);
    }
    if (assigned_to !== undefined) {
      updates.push(`assigned_to = $${paramIndex++}`);
      params.push(assigned_to);
    }
    if (resolution !== undefined) {
      updates.push(`resolution = $${paramIndex++}`);
      params.push(resolution);
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const result = await query(
      `UPDATE cases SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    // Add to case history
    await query(
      'INSERT INTO case_history (case_id, user_id, action, notes) VALUES ($1, $2, $3, $4)',
      [id, req.user.id, 'Case updated', JSON.stringify(req.body)]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update case error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteCase = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { id } = req.params;

    const result = await query('DELETE FROM cases WHERE id = $1 RETURNING *', [
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }

    res.json({ message: 'Case deleted successfully' });
  } catch (error) {
    console.error('Delete case error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCaseHistory = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { id } = req.params;

    const result = await query(
      `SELECT ch.*, u.username
       FROM case_history ch
       LEFT JOIN users u ON ch.user_id = u.id
       WHERE ch.case_id = $1
       ORDER BY ch.created_at DESC`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get case history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMyCases = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const result = await query(
      `SELECT c.*, u.username as assigned_to_name
       FROM cases c
       LEFT JOIN users u ON c.assigned_to = u.id
       WHERE c.assigned_to = $1
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get my cases error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCaseStats = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const stats = await query(`
      SELECT 
        COUNT(*) as total_cases,
        COUNT(*) FILTER (WHERE status = 'open') as open_cases,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_cases,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved_cases,
        COUNT(*) FILTER (WHERE status = 'closed') as closed_cases,
        COUNT(*) FILTER (WHERE priority = 'high') as high_priority,
        COUNT(*) FILTER (WHERE priority = 'medium') as medium_priority,
        COUNT(*) FILTER (WHERE priority = 'low') as low_priority
      FROM cases
    `);

    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Get case stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
