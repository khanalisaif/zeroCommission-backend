import express from 'express';
import { adminLogin, adminVerify } from '../controllers/adminController.js';

const router = express.Router();

router.post('/login', adminLogin);
router.post('/verify', adminVerify);

export default router;
