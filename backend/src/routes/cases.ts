import express from 'express';
import {
  createCase,
  getCases,
  getCase,
  updateCase,
  deleteCase,
  getCaseHistory,
  getMyCases,
  getCaseStats,
} from '../controllers/caseController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = express.Router();

router.post('/', authenticateToken, createCase);
router.get('/', authenticateToken, getCases);
router.get('/my-cases', authenticateToken, getMyCases);
router.get('/stats', authenticateToken, getCaseStats);
router.get('/:id', authenticateToken, getCase);
router.put('/:id', authenticateToken, updateCase);
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('manager', 'admin'),
  deleteCase
);
router.get('/:id/history', authenticateToken, getCaseHistory);

export default router;
