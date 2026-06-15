const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const { getDb } = require('../db');

const BCRYPT_SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET || 'cyber_vape_jwt_secret_2026';
const JWT_EXPIRES = '12h';

// ── EMAIL / OTP HELPERS ───────────────────────────────────────────────────────
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 465,
  secure: process.env.SMTP_SECURE !== 'false',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Generate a secure 6-digit numeric OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Build the branded OTP email HTML
function buildOtpEmail(full_name, otp) {
  return `
    <div style="background: linear-gradient(180deg, #06070f 0%, #090b12 100%); padding: 40px 10px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #e3e2e7; text-align: center;">
      <div style="max-width: 480px; margin: 0 auto; background-color: #070a12; border: 1px solid rgba(0, 240, 255, 0.2); border-radius: 20px; padding: 40px 30px; box-shadow: 0 0 30px rgba(0, 240, 255, 0.1);">
        <div style="margin-bottom: 24px;">
          <img src="cid:ulapcorner_logo" alt="Ulap Corner Logo" style="height: 60px; width: auto; border-radius: 8px; box-shadow: 0 0 15px rgba(0, 240, 255, 0.4);" />
        </div>
        <h1 style="color: #ffffff; font-size: 22px; font-weight: 800; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 2px;">Email Verification</h1>
        <p style="color: #00f0ff; font-size: 15px; font-weight: bold; margin: 0 0 16px 0; letter-spacing: 1px;">Hello, ${full_name}</p>
        <p style="color: #a5a5b5; font-size: 14px; line-height: 1.6; margin: 0 0 28px 0;">
          Use the one-time verification code below to confirm your Ulap Corner account. This code expires in <strong style="color: #00f0ff;">15 minutes</strong>.
        </p>
        <div style="background: rgba(0, 240, 255, 0.05); border: 1px solid rgba(0, 240, 255, 0.3); border-radius: 16px; padding: 24px; margin-bottom: 28px;">
          <p style="color: #a5a5b5; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; margin: 0 0 12px 0;">Your OTP Code</p>
          <div style="letter-spacing: 10px; font-size: 36px; font-weight: 900; color: #00f0ff; font-family: monospace;">${otp}</div>
        </div>
        <div style="margin-top: 28px; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 20px; text-align: left;">
          <p style="color: #5d5d70; font-size: 11px; line-height: 1.5; margin: 0;">
            If you did not register for an account at Ulap Corner, you can safely ignore this email. Do not share this code with anyone.
          </p>
        </div>
      </div>
    </div>
  `;
}

// Promisified email sender — awaitable, throws on SMTP failure
async function sendOtpEmail(toEmail, full_name, otp, isResend = false) {
  const mailOptions = {
    from: `"Ulap Corner" <${process.env.SMTP_USER || 'ulapcorner@gmail.com'}>`,
    to: toEmail,
    subject: `${otp} is your ${isResend ? 'new ' : ''}Ulap Corner verification code`,
    html: buildOtpEmail(full_name, otp),
    attachments: [{
      filename: 'ulapcorner_logo.jpg',
      path: path.join(__dirname, '../../assets/ulapcorner_logo.jpg'),
      cid: 'ulapcorner_logo'
    }]
  };
  const info = await transporter.sendMail(mailOptions);
  console.log(`✉️  [OTP-EMAIL] Sent to ${toEmail} — Message ID: ${info.messageId}`);
  return info;
}

router.post('/register', async (req, res) => {
  try {
    const { full_name, email, password, confirm_password } = req.body;
    const db = await getDb();

    if (!full_name || !email || !password || !confirm_password) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    if (password !== confirm_password) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const existing = await db.get('SELECT id, is_verified FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing && existing.is_verified) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    if (existing && !existing.is_verified) {
      // Re-registration: update OTP for unverified account
      await db.run(
        'UPDATE users SET otp_code = ?, otp_expires_at = ? WHERE email = ?',
        [otp, otpExpiresAt, email.toLowerCase()]
      );
    } else {
      // Hash password and create new account
      const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
      await db.run(
        'INSERT INTO users (full_name, email, password, role, status, is_verified, otp_code, otp_expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [full_name, email.toLowerCase(), hashedPassword, 'customer', 'Active', 1, otp, otpExpiresAt]
      );
    }

    console.log(`\n🔐 [OTP-DEBUG] OTP for ${email}: ${otp} (expires at ${otpExpiresAt})\n`);

    // Send OTP email to Gmail — awaited so any SMTP errors surface immediately
    try {
      await sendOtpEmail(email, full_name, otp);
    } catch (mailErr) {
      console.error('❌ [OTP-EMAIL] Failed to send OTP email:', mailErr.message);
      return res.status(500).json({
        error: 'Account created but failed to send verification email. Please use the Resend option on the verify page.',
        email: email.toLowerCase(),
        requires_verification: true
      });
    }

    res.status(201).json({
      message: 'Registration successful! A 6-digit verification code has been sent to your Gmail.',
      email: email.toLowerCase(),
      requires_verification: true
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// ── 2. VERIFY OTP ROUTE ───────────────────────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const db = await getDb();

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP code are required.' });
    }

    const user = await db.get(
      'SELECT id, full_name, is_verified, otp_code, otp_expires_at FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (!user) {
      return res.status(400).json({ error: 'No account found with that email address.' });
    }

    if (user.is_verified) {
      return res.json({ message: 'Account already verified. You can now log in.', already_verified: true });
    }

    if (!user.otp_code || user.otp_code !== otp.toString().trim()) {
      return res.status(400).json({ error: 'Invalid verification code. Please check and try again.' });
    }

    const now = new Date();
    const expiresAt = new Date(user.otp_expires_at);
    if (now > expiresAt) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    // Mark account as verified and clear the OTP
    await db.run(
      'UPDATE users SET is_verified = 1, otp_code = NULL, otp_expires_at = NULL WHERE id = ?',
      [user.id]
    );

    console.log(`✅ [OTP] User ${email} successfully verified.`);
    res.json({ message: 'Email verified successfully! You can now log in.', verified: true });
  } catch (err) {
    console.error('OTP verification error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── 3. RESEND OTP ROUTE ───────────────────────────────────────────────────────
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const db = await getDb();

    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const user = await db.get(
      'SELECT id, full_name, is_verified FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (!user) {
      return res.status(400).json({ error: 'No account found with that email address.' });
    }

    if (user.is_verified) {
      return res.json({ message: 'Account already verified. You can log in.' });
    }

    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await db.run(
      'UPDATE users SET otp_code = ?, otp_expires_at = ? WHERE id = ?',
      [otp, otpExpiresAt, user.id]
    );

    console.log(`\n🔁 [OTP-RESEND] New OTP for ${email}: ${otp} (expires at ${otpExpiresAt})\n`);

    // Resend OTP email to Gmail — awaited
    try {
      await sendOtpEmail(email, user.full_name, otp, true);
    } catch (mailErr) {
      console.error('❌ [OTP-EMAIL] Failed to resend OTP email:', mailErr.message);
      return res.status(500).json({ error: 'Failed to resend verification email. Please check your SMTP settings.' });
    }

    res.json({ message: 'A new verification code has been sent to your Gmail.', resent: true });
  } catch (err) {
    console.error('Resend OTP error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── 4. LOGIN ROUTE (Direct and Instant Validation) ───────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = await getDb();
    
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Paghambingin ang bcrypt password hashes
    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Simple at direktang status validation. Dapat ay 'Active' ang account ng user o admin.
    if (user.status !== 'Active' && user.status !== 'Approved') {
      return res.status(403).json({ error: 'Your account is inactive or restricted. Please contact support.' });
    }

    if (!user.is_verified) {
      return res.status(403).json({ error: 'Please verify your email address before logging in.', requires_verification: true, email: user.email });
    }

    // Pagbuo ng JSON Web Token (JWT) session payload
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    res.json({
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, new_password } = req.body;
    const db = await getDb();

    if (!token || !new_password) {
      return res.status(400).json({ error: 'Token and new password are required.' });
    }

    const user = await db.get("SELECT id FROM users WHERE otp_code = ?", [token]);
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired password reset link.' });
    }

    const hashedPassword = await bcrypt.hash(new_password, BCRYPT_SALT_ROUNDS);
    await db.run("UPDATE users SET password = ?, otp_code = NULL WHERE id = ?", [hashedPassword, user.id]);

    res.json({ message: 'Password has been reset successfully.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;