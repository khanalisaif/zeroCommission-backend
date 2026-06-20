import LoanApplication from '../models/LoanApplication.js';
import axios from 'axios';



// ─── Generate Unique Token ─────────────────────────────────────────────────
const generateToken = async () => {
  let token;
  let exists = true;
  while (exists) {
    const num = Math.floor(1000 + Math.random() * 9000);
    token = `ZC${num}`;
    exists = await LoanApplication.findOne({ token });
  }
  return token;
};

// ─── POST /api/applications ────────────────────────────────────────────────
// Submit a new loan application
export const submitApplication = async (req, res) => {
  try {
    const { name, phone, email, loan, message } = req.body;

    if (!name || !phone || !loan) {
      return res.status(400).json({
        success: false,
        message: 'Name, phone and loan type are required.',
      });
    }

    const token = await generateToken();

    const application = await LoanApplication.create({
      token,
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim().toLowerCase() : '',
      loan,
      message: message || '',
      status: 'Pending',
      viewed: false,
      submittedAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: 'Application submitted successfully!',
      data: {
        token: application.token,
        name: application.name,
        loan: application.loan,
        status: application.status,
        submittedAt: application.submittedAt,
      },
    });
  } catch (error) {
    console.error('submitApplication error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
    });
  }
};

// ─── GET /api/applications ─────────────────────────────────────────────────
// Get all loan applications (Admin)
export const getAllApplications = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const total = await LoanApplication.countDocuments(filter);
    const applications = await LoanApplication.find(filter)
      .sort({ submittedAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      data: applications,
    });
  } catch (error) {
    console.error('getAllApplications error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET /api/applications/:token ──────────────────────────────────────────
// Get single application by token
export const getApplicationByToken = async (req, res) => {
  try {
    const application = await LoanApplication.findOne({ token: req.params.token });
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    return res.status(200).json({ success: true, data: application });
  } catch (error) {
    console.error('getApplicationByToken error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── PATCH /api/applications/:token/status ─────────────────────────────────
// Update application status (Admin)
export const updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Pending', 'Approved', 'Rejected', 'Disbursed'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const application = await LoanApplication.findOneAndUpdate(
      { token: req.params.token },
      { status },
      { new: true }
    );

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    return res.status(200).json({
      success: true,
      message: `Status updated to ${status}`,
      data: application,
    });
  } catch (error) {
    console.error('updateApplicationStatus error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── DELETE /api/applications/:token ──────────────────────────────────────
// Delete an application (Admin)
export const deleteApplication = async (req, res) => {
  try {
    const application = await LoanApplication.findOneAndDelete({ token: req.params.token });
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }
    return res.status(200).json({ success: true, message: 'Application deleted.' });
  } catch (error) {
    console.error('deleteApplication error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET /api/applications/stats ──────────────────────────────────────────
// Get application statistics (Admin Dashboard)
export const getStats = async (req, res) => {
  try {
    const [total, pending, approved, rejected, disbursed, unviewed] = await Promise.all([
      LoanApplication.countDocuments(),
      LoanApplication.countDocuments({ status: 'Pending' }),
      LoanApplication.countDocuments({ status: 'Approved' }),
      LoanApplication.countDocuments({ status: 'Rejected' }),
      LoanApplication.countDocuments({ status: 'Disbursed' }),
      LoanApplication.countDocuments({ viewed: { $ne: true } }),
    ]);

    return res.status(200).json({
      success: true,
      data: { total, pending, approved, rejected, disbursed, unviewed },
    });
  } catch (error) {
    console.error('getStats error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── PATCH /api/applications/:token/view ──────────────────────────────────
// Toggle application viewed status (Admin)
export const toggleApplicationView = async (req, res) => {
  try {
    const { viewed } = req.body;

    const application = await LoanApplication.findOneAndUpdate(
      { token: req.params.token },
      { viewed },
      { new: true }
    );

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    return res.status(200).json({
      success: true,
      message: `Application marked as ${viewed ? 'viewed' : 'unviewed'}`,
      data: application,
    });
  } catch (error) {
    console.error('toggleApplicationView error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── POST /api/applications/track/send-otp ────────────────────────────────
// Send OTP to user's email to verify token tracking
export const sendUserOtp = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Token is required' });

    const application = await LoanApplication.findOne({ token });
    if (!application) {
      return res.status(404).json({ success: false, message: 'Invalid token. Application not found.' });
    }

    if (!application.email) {
      return res.status(400).json({ success: false, message: 'No registered email found for this application to send OTP.' });
    }

    const triggerOtpUrl = 'https://nextpayindia.com/zero/user/triger_otp.php';

    const formData = new URLSearchParams();
    formData.append('email', application.email);

    try {
      const apiRes = await axios.post(triggerOtpUrl, formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (apiRes.data && apiRes.data.status === false) {
        const msg = apiRes.data.message || '';
        // If the error is just that it's already sent, do not block the UI.
        if (!msg.toLowerCase().includes('already sent')) {
          return res.status(400).json({ success: false, message: msg || 'Failed to send OTP' });
        }
      }
    } catch (err) {
      console.error('Failed to trigger OTP via external API:', err.message);
      return res.status(500).json({ success: false, message: 'Failed to trigger OTP. External API error.' });
    }

    console.log(`[User OTP] Triggered external API for ${application.email} and token ${token}`);

    // Create masked email
    const [user, domain] = application.email.split('@');
    const maskedEmail = user.length > 2
      ? `${user.slice(0, 2)}***@${domain}`
      : `${user}***@${domain}`;

    return res.status(200).json({
      success: true,
      message: 'OTP sent to registered email',
      data: { email: maskedEmail, phone: application.phone }
    });
  } catch (error) {
    console.error('sendUserOtp error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── POST /api/applications/track/verify-otp ──────────────────────────────
// Verify OTP and return full application data
export const verifyUserOtp = async (req, res) => {
  try {
    const { token, otp } = req.body;
    if (!token || !otp) return res.status(400).json({ success: false, message: 'Token and OTP are required' });

    // Fetch and return application data
    const application = await LoanApplication.findOne({ token });
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    const verifyOtpUrl = 'https://nextpayindia.com/zero/verify_otp.php';
    const formData = new URLSearchParams();
    formData.append('email', application.email);
    formData.append('otp', otp);

    try {
      const apiRes = await axios.post(verifyOtpUrl, formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      console.log(`[User OTP Verify] Response from PHP:`, apiRes.data);

      if (apiRes.data && apiRes.data.status === false) {
        return res.status(400).json({ success: false, message: apiRes.data.message || 'Invalid OTP' });
      }
    } catch (err) {
      console.error('Failed to verify OTP via external API:', err.message);
      return res.status(500).json({ success: false, message: 'Failed to verify OTP. External API error.' });
    }

    return res.status(200).json({ success: true, data: application });
  } catch (error) {
    console.error('verifyUserOtp error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};
