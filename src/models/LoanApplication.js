import mongoose from 'mongoose';

// ─── Uploaded Document Sub-Schema ─────────────────────────────────────────
const documentSchema = new mongoose.Schema(
  {
    docId: { type: String, required: true },          // e.g. 'aadhaar', 'pan'
    docName: { type: String, required: true },         // e.g. 'Aadhaar Card'
    category: { type: String, default: '' },          // e.g. 'Identity & Address Proof'
    originalName: { type: String, required: true },   // original file name from user
    fileName: { type: String, required: true },       // saved file name on disk
    mimeType: { type: String, default: '' },
    size: { type: Number, default: 0 },               // bytes
    path: { type: String, required: true },           // relative path on server
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

// ─── Main Application Schema ───────────────────────────────────────────────
const loanApplicationSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    email: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
    },
    loan: {
      type: String,
      required: [true, 'Loan type is required'],
      enum: [
        'Home Loan',
        'Business Loan',
        'Personal Loan',
        'Vehicle Loan',
        'Education Loan',
        'Loan Against Property',
      ],
    },
    message: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Disbursed'],
      default: 'Pending',
    },
    viewed: {
      type: Boolean,
      default: false,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    // ─── Uploaded Documents ──────────────────────────────────────────────
    documents: [documentSchema],
    docsStatus: {
      type: String,
      enum: ['Pending', 'Uploaded'],
      default: 'Pending',
    },
  },
  {
    timestamps: true,
  }
);

const LoanApplication = mongoose.model('LoanApplication', loanApplicationSchema);

export default LoanApplication;
