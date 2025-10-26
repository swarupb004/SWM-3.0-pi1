import express from 'express';
import multer from 'multer';
import {
  importCasesFromCSV,
  exportCasesToCSV,
  getImportTemplate,
} from '../controllers/importController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = express.Router();

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

router.post(
  '/import',
  authenticateToken,
  authorizeRoles('manager', 'admin'),
  upload.single('file'),
  importCasesFromCSV
);

router.get('/export', authenticateToken, exportCasesToCSV);
router.get('/template', authenticateToken, getImportTemplate);

export default router;
