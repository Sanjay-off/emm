const transporter = require('../config/mailer');
const db = require('../config/db');
const { getTemplateByKey } = require('./templateService');
const { substitutePlaceholders, findMissingPlaceholders } = require('../utils/placeholder');
const { sendInBatches } = require('../utils/rateLimiter');
require('dotenv').config();

const FROM = `"${process.env.MAIL_FROM_NAME || 'App'}" <${process.env.GMAIL_USER}>`;

// ─────────────────────────────────────────────────────────────────────────────
//  Reset Password
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sends a password-reset email.
 *
 * @param {string} to         - Recipient email address
 * @param {string} reset_link - The password reset URL
 * @param {string} expires_in - String indicating expiration time (e.g. "30 minutes")
 */
async function sendResetPasswordEmail(to, reset_link, expires_in = '30 minutes') {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6; padding: 40px 20px; color: #1f2937; margin: 0; }
        .container { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
        .hero-img { width: 100%; height: auto; display: block; }
        .header { background-color: #4F46E5; padding: 30px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.025em; }
        .content { padding: 40px 30px; text-align: left; line-height: 1.6; }
        .content p { margin: 0 0 20px; font-size: 16px; color: #4b5563; }
        .btn-container { text-align: center; margin: 30px 0; }
        .btn { display: inline-block; padding: 14px 28px; background-color: #4F46E5; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; transition: background-color 0.2s; }
        .footer { padding: 25px 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center; }
        .footer p { margin: 0; font-size: 13px; color: #9ca3af; }
        .footer-link { color: #4F46E5; text-decoration: none; word-break: break-all; }
      </style>
    </head>
    <body>
      <div class="container">
        <img src="https://images.unsplash.com/photo-1563986768609-322da13575f3?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Security Header" class="hero-img">
        <div class="header">
          <h1>Secure Account Access</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>We received a request to reset the password for your account. If you made this request, simply click the button below to choose a new password.</p>
          
          <div class="btn-container">
            <a style="color:white;" href="${reset_link}" class="btn">Reset My Password</a>
          </div>
          
          <p>Please note that for your security, this link will expire in <strong>${expires_in}</strong>.</p>
          <p>If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
        </div>
        <div class="footer">
          <p>Having trouble clicking the button? Copy and paste this link into your browser:</p>
          <p style="margin-top: 10px;"><a href="${reset_link}" class="footer-link">${reset_link}</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: FROM,
    to,
    subject: 'Reset your password',
    html,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  Announcement (single or bulk)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates and sends an announcement email.
 *
 * For bulk sends:
 *   - Users are queried by `role` from the `users` table.
 *   - Each user's `name` and `email` are automatically injected into
 *     the placeholder values, so templates can use {{name}} / {{email}}
 *     for personalisation without the caller needing to pass them.
 *   - All other placeholders must be supplied by the caller in `placeholders`.
 *
 * @param {string} template_key  - Key identifying the template in DB
 * @param {string} role          - User role to target for bulk send
 * @param {object} placeholders  - Caller-supplied placeholder values
 * @param {string} target_table  - Name of the target users table
 * @param {string} template_table- Name of the target templates table
 * @returns {object}             - Result summary
 */
async function sendAnnouncementEmail(template_key, role, placeholders = {}, target_table = 'users', template_table = 'email_templates') {
  // 1. Fetch template
  const template = await getTemplateByKey(template_key, template_table);
  if (!template) {
    const err = new Error(`Template with key "${template_key}" not found.`);
    err.statusCode = 404;
    throw err;
  }

  // 2. Validate placeholders — user-auto fields (name, email) are excluded
  //    from the check because they are filled from the DB per user.
  const AUTO_FILLED = ['name', 'email'];
  const requiredFromCaller = template.placeholders.filter((p) => !AUTO_FILLED.includes(p));
  const missing = findMissingPlaceholders(requiredFromCaller, placeholders);

  if (missing.length > 0) {
    const err = new Error(
      `Missing placeholder values for template "${template_key}": ${missing.join(', ')}`
    );
    err.statusCode = 400;
    err.missing = missing;
    throw err;
  }

  // 3. Validate target_table purely to prevent SQL injection 
  if (!/^[a-zA-Z0-9_]+$/.test(target_table)) {
    const err = new Error(`Invalid table name: "${target_table}"`);
    err.statusCode = 400;
    throw err;
  }

  // 4. Query target users by role
  const [users] = await db.execute(
    `SELECT id, name, email FROM ${target_table} WHERE role = ?`,
    [role]
  );

  if (users.length === 0) {
    return { sent: 0, failed: [], message: `No users found with role "${role}".` };
  }

  // 4. Send in batches with rate limiting
  const results = await sendInBatches(users, async (user) => {
    // Merge caller-supplied values with per-user auto-fill values.
    // Per-user values (name, email) take precedence.
    const mergedValues = {
      ...placeholders,
      name: user.name,
      email: user.email,
    };

    const html = substitutePlaceholders(template.html_body, mergedValues);
    const subject = substitutePlaceholders(template.subject, mergedValues);

    await transporter.sendMail({
      from: FROM,
      to: user.email,
      subject,
      html,
    });
  });

  return {
    total: users.length,
    sent: results.sent,
    failed: results.failed,
  };
}

module.exports = { sendResetPasswordEmail, sendAnnouncementEmail };