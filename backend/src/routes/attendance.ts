import express from 'express';
import {
  checkIn,
  checkOut,
  startBreak,
  endBreak,
  getMyAttendance,
  getTeamAttendance,
  getTodayStatus,
} from '../controllers/attendanceController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = express.Router();

router.post('/check-in', authenticateToken, checkIn);
router.post('/check-out', authenticateToken, checkOut);
router.post('/break-start', authenticateToken, startBreak);
router.post('/break-end', authenticateToken, endBreak);
router.get('/my-attendance', authenticateToken, getMyAttendance);
router.get('/today', authenticateToken, getTodayStatus);
router.get(
  '/team',
  authenticateToken,
  authorizeRoles('manager', 'admin'),
  getTeamAttendance
);

export default router;
