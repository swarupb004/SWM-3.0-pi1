import { Response } from 'express';
import { parse } from 'csv-parse/sync';
import { query } from '../config/database';
import { AuthRequest } from '../middleware/auth';

interface CaseCSVRow {
  case_number: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  case_type: string;
  priority?: string;
  description?: string;
  status?: string;
}

export const importCasesFromCSV = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileContent = req.file.buffer.toString('utf-8');

    // Parse CSV
    const records: CaseCSVRow[] = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    if (records.length === 0) {
      return res.status(400).json({ error: 'CSV file is empty' });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[],
    };

    // Import each case
    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      try {
        // Validate required fields
        if (!record.case_number || !record.customer_name || !record.case_type) {
          results.failed++;
          results.errors.push({
            row: i + 2, // +2 because of header and 0-index
            error: 'Missing required fields',
            data: record,
          });
          continue;
        }

        // Check if case already exists
        const existing = await query(
          'SELECT id FROM cases WHERE case_number = $1',
          [record.case_number]
        );

        if (existing.rows.length > 0) {
          results.failed++;
          results.errors.push({
            row: i + 2,
            error: 'Case number already exists',
            data: record,
          });
          continue;
        }

        // Insert case
        await query(
          `INSERT INTO cases 
           (case_number, customer_name, customer_email, customer_phone, case_type, priority, description, status, assigned_to)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            record.case_number,
            record.customer_name,
            record.customer_email || null,
            record.customer_phone || null,
            record.case_type,
            record.priority || 'medium',
            record.description || '',
            record.status || 'open',
            req.user.id,
          ]
        );

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          row: i + 2,
          error: error.message,
          data: record,
        });
      }
    }

    res.json({
      message: 'Import completed',
      results,
    });
  } catch (error) {
    console.error('Import CSV error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const exportCasesToCSV = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { status, priority, assigned_to } = req.query;

    let queryText = 'SELECT * FROM cases WHERE 1=1';
    const params: any[] = [];

    if (status) {
      queryText += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    if (priority) {
      queryText += ` AND priority = $${params.length + 1}`;
      params.push(priority);
    }

    if (assigned_to) {
      queryText += ` AND assigned_to = $${params.length + 1}`;
      params.push(assigned_to);
    }

    queryText += ' ORDER BY created_at DESC';

    const result = await query(queryText, params);

    // Generate CSV
    const headers = [
      'case_number',
      'customer_name',
      'customer_email',
      'customer_phone',
      'case_type',
      'priority',
      'status',
      'description',
      'created_at',
      'resolved_at',
    ];

    let csv = headers.join(',') + '\n';

    result.rows.forEach((row) => {
      const values = headers.map((header) => {
        const value = row[header] || '';
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csv += values.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=cases_export.csv');
    res.send(csv);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getImportTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const template = `case_number,customer_name,customer_email,customer_phone,case_type,priority,description,status
CASE001,John Doe,john@example.com,123-456-7890,Technical Support,high,Computer not starting,open
CASE002,Jane Smith,jane@example.com,098-765-4321,Billing,medium,Invoice inquiry,open`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=case_import_template.csv');
    res.send(template);
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
