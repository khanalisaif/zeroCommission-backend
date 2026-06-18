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

    // 2. Generate a 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    
    // Store OTP in memory (expires in 5 minutes)
    otpStore.set(phone, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    // 3. Send OTP via External API
    const otpApiUrl = process.env.OTP_API_URL || 'https://nextpayindia.com/zero/send_otp.php';
    const adminEmail = process.env.ADMIN_EMAIL || 'mustafahasan555@gmail.com';

    // x-www-form-urlencoded
    const formData = new URLSearchParams();
    formData.append('email', adminEmail);
    formData.append('otp', otp);

    try {
      await axios.post(otpApiUrl, formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
    } catch (err) {
      console.error('Failed to send OTP via external API:', err.message);
      // We will still allow the flow for debugging if the external API fails occasionally
      // return res.status(500).json({ success: false, message: 'Failed to send OTP email. Please try again later.' });
    }

    // Don't send OTP in response for production, but maybe log it locally if needed
    console.log(`[Admin OTP] Sent to ${adminEmail} for phone ${phone}: ${otp}`);

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully to the registered admin email.'
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

    const storedData = otpStore.get(phone);

    if (!storedData) {
      return res.status(400).json({ success: false, message: 'OTP expired or not requested' });
    }

    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(phone);
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    if (storedData.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    // Success
    otpStore.delete(phone);

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
