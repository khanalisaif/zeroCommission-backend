import express from 'express';
import {
  submitApplication,
  getAllApplications,
  getApplicationByToken,
  // updateApplicationStatus,
  // deleteApplication,
  getStats,
  toggleApplicationView,
  sendUserOtp,
  verifyUserOtp
} from '../controllers/applicationController.js';

const router = express.Router();

// ─── Stats Route (must be before /:token) ──────────────────────────────────
// GET    /api/applications/stats    → Get dashboard statistics
router.get('/stats', getStats);

// ─── Public Routes ──────────────────────────────────────────────
// POST   /api/applications/track/send-otp   → Send OTP for tracking
router.post('/track/send-otp', sendUserOtp);

// POST   /api/applications/track/verify-otp → Verify OTP for tracking
router.post('/track/verify-otp', verifyUserOtp);

// POST   /api/applications          → Submit new loan application
router.post('/', submitApplication);

// GET    /api/applications          → Get all applications (with optional ?status=Pending)
router.get('/', getAllApplications);

// GET    /api/applications/:token   → Get application by token
router.get('/:token', getApplicationByToken);

// ─── Admin Routes ───────────────────────────────────────────────
// PATCH  /api/applications/:token/status → Update application status
// router.patch('/:token/status', updateApplicationStatus);

// PATCH  /api/applications/:token/view → Update viewed status
router.patch('/:token/view', toggleApplicationView);

// DELETE /api/applications/:token   → Delete an application
// router.delete('/:token', deleteApplication);

export default router;
