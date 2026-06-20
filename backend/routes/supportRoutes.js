import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import isAdmin from '../middlewares/isAdmin.js';
import { uploadSupportImages } from '../s3Config.js';
import {
  createSupportTicket,
  getMySupportTickets,
  getAdminSupportTickets,
  addMessageToTicket,
  resolveSupportTicket
} from '../controllers/supportController.js';

const router = express.Router();

router.use(protect);

// User support ticket endpoints
router.post('/', uploadSupportImages.single('image'), createSupportTicket);
router.get('/my-tickets', getMySupportTickets);
router.post('/:id/message', addMessageToTicket);

// Admin-only support ticket endpoints
router.get('/admin/tickets', isAdmin, getAdminSupportTickets);
router.put('/:id/resolve', isAdmin, resolveSupportTicket);

export default router;
