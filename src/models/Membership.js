// models/Membership.js
const mongoose = require('mongoose');
const membershipSchema = new mongoose.Schema({
  memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  amountPaid: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['success', 'failed'], required: true },
  paymentRef: { type: String, required: true }, // Simple transaction tracking ID
  expiresAt: { type: Date },
  serviceType: { type: String, enum: ['SUBSCRIPTION', 'ON_DEMAND'], required: true},
}, { timestamps: true });
module.exports = mongoose.model('Membership', membershipSchema);