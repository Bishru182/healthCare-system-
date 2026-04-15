// models/Payment.js
// ─────────────────────────────────────────────
// Mongoose schema for Payment documents
// ─────────────────────────────────────────────

import mongoose from 'mongoose';
import { PAYMENT_STATUS, PAYMENT_METHOD } from '../config/constants.js';

const paymentSchema = new mongoose.Schema(
  {
    // References to other services (stored as strings to avoid
    // tight coupling with other service databases)
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'patientId is required'],
      index: true,
    },

    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'appointmentId is required'],
      // Unique index ensures one payment record per appointment
      // (duplicate prevention)
      unique: true,
      index: true,
    },

    // Financials
    amount: {
      type: Number,
      required: [true, 'amount is required'],
      min: [0.01, 'amount must be greater than 0'],
    },

    currency: {
      type: String,
      required: [true, 'currency is required'],
      uppercase: true,
      default: 'USD',
      trim: true,
      maxlength: [3, 'currency code must be 3 characters'],
    },

    // Lifecycle status
    status: {
      type: String,
      enum: {
        values: Object.values(PAYMENT_STATUS),
        message: `status must be one of: ${Object.values(PAYMENT_STATUS).join(', ')}`,
      },
      default: PAYMENT_STATUS.PENDING,
    },

    // How the patient paid
    paymentMethod: {
      type: String,
      enum: {
        values: Object.values(PAYMENT_METHOD),
        message: `paymentMethod must be one of: ${Object.values(PAYMENT_METHOD).join(', ')}`,
      },
      default: PAYMENT_METHOD.MOCK,
    },

    // Unique ID returned by the payment gateway on success
    transactionId: {
      type: String,
      default: null,
      trim: true,
    },

    // Optional: failure reason for auditing
    failureReason: {
      type: String,
      default: null,
      trim: true,
    },

    // Payment gateway provider used (mock, stripe, payhere)
    provider: {
      type: String,
      default: process.env.PAYMENT_PROVIDER || 'mock',
    },
  },
  {
    // Automatically adds createdAt and updatedAt
    timestamps: true,
    // Clean up __v field
    versionKey: false,
  }
);

// ─── Index for fast patient-level queries ───────────────────────────────────
paymentSchema.index({ patientId: 1, createdAt: -1 });

// ─── Virtual: human-friendly amount ─────────────────────────────────────────
paymentSchema.virtual('formattedAmount').get(function () {
  return `${this.currency} ${this.amount.toFixed(2)}`;
});

// ─── Instance method: check if payment is still modifiable ──────────────────
paymentSchema.methods.isPending = function () {
  return this.status === PAYMENT_STATUS.PENDING;
};

// ─── Serialisation: include virtuals & remove internal fields ────────────────
paymentSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret.id; // remove duplicate id from virtuals
    return ret;
  },
});

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
