import axios from 'axios';

// In-memory store for OTPs: Map<phone, { otp, expiresAt }>
const otpStore = new Map();

/**
 * Generate and send OTP to admin email if phone is authorized
 * POST /api/admin/login
 */
export const adminLogin = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    // 1. Check if phone is in authorized ADMIN_PHONES
    const allowedPhonesStr = process.env.ADMIN_PHONES || '';
    const allowedPhones = allowedPhonesStr.split(',').map(p => p.trim());

    if (!allowedPhones.includes(phone)) {
      return res.status(403).json({ success: false, message: 'Unauthorized. This phone number is not registered as an Admin.' });
    }

    // 2. Trigger OTP generation and sending via External API
    const otpApiUrl = process.env.OTP_API_URL || 'https://nextpayindia.com/zero/user/triger_otp.php';
    const adminEmail = process.env.ADMIN_EMAIL || 'mustafahasan555@gmail.com';

    const formData = new URLSearchParams();
    formData.append('email', adminEmail);

    try {
      const apiRes = await axios.post(otpApiUrl, formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      console.log(`[Admin OTP Trigger] Response from PHP:`, apiRes.data);

      if (apiRes.data && apiRes.data.status === false) {
        const msg = apiRes.data.message || '';
        // If the error is just that it's already sent, do not block the UI.
        if (!msg.toLowerCase().includes('already sent')) {
          return res.status(400).json({ success: false, message: msg || 'Failed to send OTP' });
        }
      }
    } catch (err) {
      console.error('Failed to trigger Admin OTP via external API:', err.message);
      return res.status(500).json({ success: false, message: 'Failed to trigger OTP. External API error.' });
    }

    // Create masked email for response
    const [user, domain] = adminEmail.split('@');
    const maskedEmail = user.length > 2
      ? `${user.slice(0, 2)}***@${domain}`
      : `${user}***@${domain}`;

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully to the registered admin email.',
      data: { email: maskedEmail }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error during login', error: error.message });
  }
};

/**
 * Verify OTP
 * POST /api/admin/verify
 */
export const adminVerify = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: 'Phone and OTP are required' });
    }

    // Check if phone is authorized
    const allowedPhonesStr = process.env.ADMIN_PHONES || '';
    const allowedPhones = allowedPhonesStr.split(',').map(p => p.trim());
    if (!allowedPhones.includes(phone)) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    const verifyOtpUrl = process.env.OTP_VERIFY_URL || 'https://nextpayindia.com/zero/verify_otp.php';
    const adminEmail = process.env.ADMIN_EMAIL || 'mustafahasan555@gmail.com';

    const formData = new URLSearchParams();
    formData.append('email', adminEmail);
    formData.append('otp', otp);

    try {
      const apiRes = await axios.post(verifyOtpUrl, formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      console.log(`[Admin OTP Verify] Response from PHP:`, apiRes.data);

      if (apiRes.data && apiRes.data.status === false) {
        return res.status(400).json({ success: false, message: apiRes.data.message || 'Invalid OTP' });
      }
    } catch (err) {
      console.error('Failed to verify Admin OTP via external API:', err.message);
      return res.status(500).json({ success: false, message: 'Failed to verify OTP. External API error.' });
    }

    // Success
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token: 'admin-token-' + phone,
        role: 'admin'
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error during verification', error: error.message });
  }
};
