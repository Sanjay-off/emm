const { sendResetPasswordEmail, sendAnnouncementEmail } = require('../services/emailService');

/**
 * POST /email/reset-password
 *
 * Body:
 *   {
 *     "email":      "user@example.com",   // recipient
 *     "reset_link": "https://...",        // password reset URL
 *     "expires_in": "1 hour",             // expiration text mapping to template
 *     "name":       "Sanjay"              // recipient name for personalization
 *   }
 */
async function handleResetPassword(req, res) {
  const { email, reset_link, expires_in, name } = req.body;

  // ── Validate ────────────────────────────────────────────
  const missing = [];
  if (!email)      missing.push('email');
  if (!reset_link) missing.push('reset_link');

  if (missing.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Missing required fields: ${missing.join(', ')}`,
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email address.' });
  }

  try {
    await sendResetPasswordEmail(email, reset_link, expires_in || '30 minutes', name || 'User');
    return res.status(200).json({
      success: true,
      message: `Password reset email sent to ${email}.`,
    });
  } catch (err) {
    console.error('[Email] sendResetPassword error:', err);
    return res.status(500).json({ success: false, message: 'Failed to send email.' });
  }
}

/**
 * POST /email/announcement
 *
 * Body:
 *   {
 *     "template_key":  "promo_q1",          // key of a stored template
 *     "role":          "subscriber",         // target user role/group
 *     "target_table":  "users",              // dynamic table name
 *     "placeholders":  {                     // values for non-user placeholders
 *       "announcement_title": "Big Sale!",
 *       "cta_link": "https://shop.example.com"
 *     }
 *   }
 *
 * Notes:
 *   - {{name}} and {{email}} in the template are auto-filled per user from the DB.
 *   - All other placeholders found in the template must be supplied here.
 *   - The service validates this and returns 400 with the list of missing ones.
 */
async function handleAnnouncement(req, res) {
  const { template_key, role, placeholders, target_table, template_table } = req.body;

  // ── Validate ────────────────────────────────────────────
  const missing = [];
  if (!template_key) missing.push('template_key');
  if (!role)         missing.push('role');

  if (missing.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Missing required fields: ${missing.join(', ')}`,
    });
  }

  if (placeholders !== undefined && typeof placeholders !== 'object') {
    return res.status(400).json({
      success: false,
      message: '"placeholders" must be a JSON object.',
    });
  }

  try {
    const result = await sendAnnouncementEmail(
      template_key,
      role,
      placeholders || {},
      target_table || 'users',
      template_table || 'email_templates'
    );
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    // Template not found
    if (err.statusCode === 404) {
      return res.status(404).json({ success: false, message: err.message });
    }
    // Missing placeholders
    if (err.statusCode === 400) {
      return res.status(400).json({
        success: false,
        message: err.message,
        missing_placeholders: err.missing || [],
      });
    }
    console.error('[Email] sendAnnouncement error:', err);
    return res.status(500).json({ success: false, message: 'Failed to send announcement.' });
  }
}

module.exports = { handleResetPassword, handleAnnouncement };