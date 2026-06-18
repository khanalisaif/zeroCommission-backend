import path from 'path';
import fs from 'fs';
import LoanApplication from '../models/LoanApplication.js';
import { UPLOAD_DIR } from '../middleware/uploadMiddleware.js';

// ─── Doc category label map (matches frontend) ────────────────────────────
const DOC_CATEGORY_MAP = {
  aadhaar: 'Identity & Address Proof',
  pan: 'Identity & Address Proof',
  passport: 'Identity & Address Proof',
  voter: 'Identity & Address Proof',
  salary: 'Income & Financial Proof',
  itr: 'Income & Financial Proof',
  bankstat: 'Income & Financial Proof',
  employment: 'Income & Financial Proof',
  propdoc: 'Property / Collateral Documents',
  propval: 'Property / Collateral Documents',
  noc: 'Property / Collateral Documents',
  encumbrance: 'Property / Collateral Documents',
  rc: 'Vehicle Loan Documents',
  insurance: 'Vehicle Loan Documents',
  quotation: 'Vehicle Loan Documents',
  driverlicense: 'Vehicle Loan Documents',
  bizreg: 'Business Loan Documents',
  bizfinance: 'Business Loan Documents',
  gstreturn: 'Business Loan Documents',
  partnershipdeed: 'Business Loan Documents',
  admissionletter: 'Education Loan Documents',
  marksheet: 'Education Loan Documents',
  feestruct: 'Education Loan Documents',
  coursedoc: 'Education Loan Documents',
  otherdocs: 'Other Documents',
};

const DOC_NAME_MAP = {
  aadhaar: 'Aadhaar Card',
  pan: 'PAN Card',
  passport: 'Passport',
  voter: "Voter's ID",
  salary: 'Salary Slips',
  itr: 'ITR / Form 16',
  bankstat: 'Bank Statement',
  employment: 'Employment Letter',
  propdoc: 'Property Documents',
  propval: 'Property Valuation',
  noc: 'NOC from Society / Builder',
  encumbrance: 'Encumbrance Certificate',
  rc: 'Vehicle RC Book',
  insurance: 'Vehicle Insurance',
  quotation: 'Vehicle Quotation',
  driverlicense: "Driver's License",
  bizreg: 'Business Registration',
  bizfinance: 'Business Financials',
  gstreturn: 'GST Returns',
  partnershipdeed: 'Partnership Deed / MoA',
  admissionletter: 'Admission Letter',
  marksheet: 'Previous Marksheets',
  feestruct: 'Fee Structure',
  coursedoc: 'Course Duration & Details',
  otherdocs: 'Other Documents',
};

// ─── POST /api/applications/:token/documents ──────────────────────────────
// Upload documents for an application
export const uploadDocuments = async (req, res) => {
  try {
    const { token } = req.params;
    const files = req.files; // multer: array of files

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded.' });
    }

    const application = await LoanApplication.findOne({ token });
    if (!application) {
      // Clean up uploaded files if app not found
      files.forEach(f => { try { fs.unlinkSync(f.path); } catch (_) { } });
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    // Build document entries from uploaded files
    const newDocs = files.map(file => ({
      docId: file.fieldname,
      docName: DOC_NAME_MAP[file.fieldname] || file.fieldname,
      category: DOC_CATEGORY_MAP[file.fieldname] || 'Other',
      originalName: file.originalname,
      fileName: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      path: `uploads/${token}/${file.filename}`,  // relative path for serving
      uploadedAt: new Date(),
    }));

    // Push to documents array (keep existing + add new)
    application.documents.push(...newDocs);
    application.docsStatus = 'Uploaded';
    await application.save();

    return res.status(200).json({
      success: true,
      message: `${files.length} document(s) uploaded successfully.`,
      data: {
        token,
        totalDocuments: application.documents.length,
        uploaded: newDocs.map(d => ({ docId: d.docId, docName: d.docName, fileName: d.fileName, size: d.size })),
      },
    });
  } catch (error) {
    console.error('uploadDocuments error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error during upload.' });
  }
};

// ─── GET /api/applications/:token/documents ───────────────────────────────
// Get all documents for an application
export const getDocuments = async (req, res) => {
  try {
    const application = await LoanApplication.findOne(
      { token: req.params.token },
      { documents: 1, token: 1, name: 1, docsStatus: 1 }
    );
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    return res.status(200).json({
      success: true,
      data: {
        token: application.token,
        name: application.name,
        docsStatus: application.docsStatus,
        totalDocuments: application.documents.length,
        documents: application.documents,
      },
    });
  } catch (error) {
    console.error('getDocuments error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── DELETE /api/applications/:token/documents/:docId ─────────────────────
// Delete a specific document
export const deleteDocument = async (req, res) => {
  try {
    const { token, docFileId } = req.params;

    const application = await LoanApplication.findOne({ token });
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    const docIndex = application.documents.findIndex(d => d._id.toString() === docFileId);
    if (docIndex === -1) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const doc = application.documents[docIndex];
    // Delete file from disk
    const filePath = path.join(UPLOAD_DIR, '..', doc.path);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (_) { }
    }

    application.documents.splice(docIndex, 1);
    if (application.documents.length === 0) application.docsStatus = 'Pending';
    await application.save();

    return res.status(200).json({ success: true, message: 'Document deleted.' });
  } catch (error) {
    console.error('deleteDocument error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};
