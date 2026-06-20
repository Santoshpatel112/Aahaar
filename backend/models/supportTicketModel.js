import mongoose from 'mongoose';

const supportMessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderRole: {
    type: String,
    enum: ['user', 'admin'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const supportTicketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userRole: {
    type: String,
    enum: ['donor', 'ngo'],
    required: true
  },
  issueType: {
    type: String,
    required: true
  },
  relatedId: {
    type: String, // String to handle donation tokens (e.g. 46OK7N) or Mongo ObjectIds seamlessly
    default: null,
    index: true
  },
  urgency: {
    type: String,
    enum: ['medium', 'critical', 'urgent'],
    required: true,
    default: 'medium'
  },
  description: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['open', 'resolved'],
    default: 'open',
    index: true
  },
  messages: [supportMessageSchema]
}, {
  timestamps: true
});

const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);
export default SupportTicket;
