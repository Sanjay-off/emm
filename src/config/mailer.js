const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD, // Gmail App Password (not your real password)
  },
});

// Verify connection on startup
transporter.verify((err) => {
  if (err) {
    console.error('[Mailer] Failed to connect to Gmail:', err.message);
  } else {
    console.log('[Mailer] Gmail SMTP ready');
  }
});

module.exports = transporter;