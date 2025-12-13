import { Response } from 'express';
import { query, getDatabaseType } from '../config/database';
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

    let result;
    const dbType = getDatabaseType();
    
    if (dbType === 'mysql') {
      await query(
        `INSERT INTO cases 
         (case_number, customer_name, customer_email, customer_phone, case_type, priority, description, assigned_to, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
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
      result = await query('SELECT * FROM cases WHERE case_number = $1', [case_number]);
    } else {
      result = await query(
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
    }

    // Add to case history
    await query(
      'INSERT INTO case_history (case_id, user_id, action, notes) VALUES ($1, $2, $3, $4)',
      [result.rows[0].id, req.user.id, 'Case created', description]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Create case error:', error);
    if (error.code === '23505' || error.code === 'ER_DUP_ENTRY') {
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

    const dbType = getDatabaseType();
    
    let stats;
    if (dbType === 'mysql') {
      // MySQL uses SUM with CASE instead of COUNT FILTER
      stats = await query(`
        SELECT 
          COUNT(*) as total_cases,
          SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_cases,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_cases,
          SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_cases,
          SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_cases,
          SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high_priority,
          SUM(CASE WHEN priority = 'medium' THEN 1 ELSE 0 END) as medium_priority,
          SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) as low_priority
        FROM cases
      `);
    } else {
      // PostgreSQL supports COUNT FILTER syntax
      stats = await query(`
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
    }

    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Get case stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Book out a case - marks a case as being worked on by an agent
export const bookOutCase = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { id } = req.params;
    const dbType = getDatabaseType();

    // Check if case exists and its current status
    const currentCase = await query(
      `SELECT c.*, u.username as booked_out_by_name 
       FROM cases c 
       LEFT JOIN users u ON c.booked_out_by = u.id 
       WHERE c.id = $1`,
      [id]
    );

    if (currentCase.rows.length === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const caseData = currentCase.rows[0];

    // Check if case is already booked out by another user
    if (caseData.booked_out_by && caseData.booked_out_by !== req.user.id) {
      return res.status(409).json({
        error: 'Case already booked out',
        message: `This case is already booked out by ${caseData.booked_out_by_name || 'another user'}`,
        booked_out_by: caseData.booked_out_by_name || 'another user',
        booked_out_at: caseData.booked_out_at,
        conflict: true,
        action_required: 'Please add a new case or select a different case to book out'
      });
    }

    // Check if case is already closed/resolved
    if (caseData.status === 'closed' || caseData.status === 'resolved') {
      return res.status(409).json({
        error: 'Case already completed',
        message: 'This case has already been resolved or closed',
        status: caseData.status,
        conflict: true,
        action_required: 'Please add a new case or select a different case to book out'
      });
    }

    // Book out the case
    let result;
    if (dbType === 'mysql') {
      await query(
        `UPDATE cases SET 
         booked_out_at = NOW(), 
         booked_out_by = $1, 
         status = 'in_progress',
         updated_at = NOW()
         WHERE id = $2`,
        [req.user.id, id]
      );
      result = await query('SELECT * FROM cases WHERE id = $1', [id]);
    } else {
      result = await query(
        `UPDATE cases SET 
         booked_out_at = NOW(), 
         booked_out_by = $1, 
         status = 'in_progress',
         updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [req.user.id, id]
      );
    }

    // Add to case history
    await query(
      'INSERT INTO case_history (case_id, user_id, action, notes) VALUES ($1, $2, $3, $4)',
      [id, req.user.id, 'Case booked out', `Case booked out by user ${req.user.id}`]
    );

    res.json({
      success: true,
      message: 'Case booked out successfully',
      case: result.rows[0]
    });
  } catch (error) {
    console.error('Book out case error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Release a booked out case
export const releaseCase = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { id } = req.params;
    const dbType = getDatabaseType();

    // Check if case exists
    const currentCase = await query('SELECT * FROM cases WHERE id = $1', [id]);

    if (currentCase.rows.length === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const caseData = currentCase.rows[0];

    // Only the user who booked out the case or admin can release it
    if (caseData.booked_out_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to release this case' });
    }

    // Release the case
    let result;
    if (dbType === 'mysql') {
      await query(
        `UPDATE cases SET 
         booked_out_at = NULL, 
         booked_out_by = NULL, 
         status = 'open',
         updated_at = NOW()
         WHERE id = $1`,
        [id]
      );
      result = await query('SELECT * FROM cases WHERE id = $1', [id]);
    } else {
      result = await query(
        `UPDATE cases SET 
         booked_out_at = NULL, 
         booked_out_by = NULL, 
         status = 'open',
         updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id]
      );
    }

    // Add to case history
    await query(
      'INSERT INTO case_history (case_id, user_id, action, notes) VALUES ($1, $2, $3, $4)',
      [id, req.user.id, 'Case released', `Case released by user ${req.user.id}`]
    );

    res.json({
      success: true,
      message: 'Case released successfully',
      case: result.rows[0]
    });
  } catch (error) {
    console.error('Release case error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all allocated cases for an agent that are available for booking out
export const getAllocatedCases = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get all cases assigned to this agent that are not yet booked out or completed
    const result = await query(
      `SELECT c.*, u.username as assigned_to_name,
              CASE WHEN c.booked_out_by IS NOT NULL THEN 1 ELSE 0 END as is_booked_out,
              bu.username as booked_out_by_name
       FROM cases c
       LEFT JOIN users u ON c.assigned_to = u.id
       LEFT JOIN users bu ON c.booked_out_by = bu.id
       WHERE c.assigned_to = $1
         AND c.status NOT IN ('closed', 'resolved')
       ORDER BY c.priority DESC, c.created_at ASC`,
      [req.user.id]
    );

    // Separate into available and already booked out
    const available = result.rows.filter((c: any) => !c.booked_out_by);
    const bookedOut = result.rows.filter((c: any) => c.booked_out_by);

    res.json({
      total: result.rows.length,
      available: available.length,
      booked_out: bookedOut.length,
      cases: result.rows,
      available_cases: available,
      booked_out_cases: bookedOut
    });
  } catch (error) {
    console.error('Get allocated cases error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Check if a case is available for booking out (for sync conflict detection)
export const checkCaseAvailability = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { id } = req.params;

    const result = await query(
      `SELECT c.*, u.username as booked_out_by_name
       FROM cases c
       LEFT JOIN users u ON c.booked_out_by = u.id
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const caseData = result.rows[0];

    const isAvailable = !caseData.booked_out_by && 
                        caseData.status !== 'closed' && 
                        caseData.status !== 'resolved';

    res.json({
      case_id: caseData.id,
      case_number: caseData.case_number,
      available: isAvailable,
      status: caseData.status,
      booked_out_by: caseData.booked_out_by_name || null,
      booked_out_at: caseData.booked_out_at || null,
      message: isAvailable 
        ? 'Case is available for booking out' 
        : `Case is not available: ${caseData.booked_out_by_name ? `already booked out by ${caseData.booked_out_by_name}` : `status is ${caseData.status}`}`
    });
  } catch (error) {
    console.error('Check case availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
