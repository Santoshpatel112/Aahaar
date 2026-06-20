import SupportTicket from '../models/supportTicketModel.js';
import Ngo from '../models/ngoModel.js';
import User from '../models/userModel.js';
import { getFileUrl } from '../s3Config.js';
import { notify } from '../services/notification.service.js';
import { getIO } from '../sockets/socket.js';
import asyncHandler from '../middlewares/asyncHandler.js';

// Helper to generate a unique ticket ID
async function generateUniqueTicketId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let unique = false;
  let ticketId = '';
  
  while (!unique) {
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    ticketId = `ST-${result}`;
    const existing = await SupportTicket.findOne({ ticketId });
    if (!existing) {
      unique = true;
    }
  }
  return ticketId;
}

// @desc    Create support ticket
// @route   POST /aahar/support
// @access  Private
export const createSupportTicket = asyncHandler(async (req, res) => {
  const { issueType, relatedId, urgency, description } = req.body;

  if (!issueType || !urgency || !description) {
    res.status(400);
    throw new Error('Please fill in all required fields');
  }

  const ngo = await Ngo.findOne({ registeredBy: req.user._id });
  const userRole = ngo ? 'ngo' : 'donor';

  const ticketId = await generateUniqueTicketId();
  const imageUrl = req.file ? getFileUrl(req.file) : null;

  const ticket = await SupportTicket.create({
    ticketId,
    user: req.user._id,
    userRole,
    issueType,
    relatedId: relatedId || null,
    urgency,
    description,
    imageUrl,
    status: 'open',
    messages: []
  });

  // Notify admins
  try {
    const admins = await User.find({ isAdmin: true });
    for (const admin of admins) {
      await notify({
        receiverId: admin._id,
        receiverRole: 'admin',
        title: 'New Support Ticket',
        message: `Ticket ${ticketId} (${issueType}) created with urgency ${urgency}.`,
        type: 'SUPPORT_TICKET_CREATED',
        entityType: 'System',
        entityId: ticket._id,
        priority: urgency === 'critical' ? 'high' : 'medium',
        channels: ['inApp', 'push']
      });
    }
  } catch (err) {
    console.error('Error sending admin ticket notifications:', err);
  }

  res.status(201).json(ticket);
});

// @desc    Get user's support tickets
// @route   GET /aahar/support/my-tickets
// @access  Private
export const getMySupportTickets = asyncHandler(async (req, res) => {
  const tickets = await SupportTicket.find({ user: req.user._id })
    .sort({ createdAt: -1 });
  res.status(200).json(tickets);
});

// @desc    Get all support tickets (admin view)
// @route   GET /aahar/support/admin/tickets
// @access  Private/Admin
export const getAdminSupportTickets = asyncHandler(async (req, res) => {
  const tickets = await SupportTicket.find({})
    .populate('user', 'firstName surname email phone city')
    .sort({ createdAt: -1 });
  res.status(200).json(tickets);
});

// @desc    Add message to a support ticket
// @route   POST /aahar/support/:id/message
// @access  Private
export const addMessageToTicket = asyncHandler(async (req, res) => {
  const { message } = req.body;
  const ticketId = req.params.id;

  if (!message || message.trim() === '') {
    res.status(400);
    throw new Error('Message content is required');
  }

  const ticket = await SupportTicket.findById(ticketId);
  if (!ticket) {
    res.status(404);
    throw new Error('Support ticket not found');
  }

  // Authorize: Only the ticket creator or an Admin can send messages
  const isCreator = ticket.user.toString() === req.user._id.toString();
  const isAdmin = req.user.isAdmin === true;

  if (!isCreator && !isAdmin) {
    res.status(403);
    throw new Error('Not authorized to access this ticket');
  }

  // Prevent sending messages to resolved tickets
  if (ticket.status === 'resolved') {
    res.status(400);
    throw new Error('Cannot message on a resolved and closed ticket');
  }

  const senderRole = isAdmin ? 'admin' : 'user';

  const newMessage = {
    sender: req.user._id,
    senderRole,
    message,
    createdAt: new Date()
  };

  ticket.messages.push(newMessage);
  await ticket.save();

  // Populate user context for socket message
  const populatedTicket = await SupportTicket.findById(ticketId)
    .populate('user', 'firstName surname email');

  const savedMessage = populatedTicket.messages[populatedTicket.messages.length - 1];

  // Socket broadcast message to ticket room
  const io = getIO();
  if (io) {
    io.to(ticketId.toString()).emit('ticket_message_received', {
      ticketId,
      message: savedMessage
    });
  }

  res.status(201).json(savedMessage);
});

// @desc    Resolve support ticket
// @route   PUT /aahar/support/:id/resolve
// @access  Private/Admin
export const resolveSupportTicket = asyncHandler(async (req, res) => {
  const ticketId = req.params.id;

  const ticket = await SupportTicket.findById(ticketId);
  if (!ticket) {
    res.status(404);
    throw new Error('Support ticket not found');
  }

  ticket.status = 'resolved';
  await ticket.save();

  // Socket broadcast status update
  const io = getIO();
  if (io) {
    io.to(ticketId.toString()).emit('ticket_resolved', ticket);
  }

  // Notify user
  try {
    await notify({
      receiverId: ticket.user,
      receiverRole: ticket.userRole,
      title: 'Support Issue Resolved',
      message: `Your support ticket ${ticket.ticketId} has been marked as resolved and closed.`,
      type: 'SUPPORT_TICKET_RESOLVED',
      entityType: 'System',
      entityId: ticket._id,
      priority: 'medium',
      channels: ['inApp', 'push']
    });
  } catch (err) {
    console.error('Error sending ticket resolved notification:', err);
  }

  res.status(200).json(ticket);
});
