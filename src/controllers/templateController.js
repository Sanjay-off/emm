const { createTemplate, getTemplateByKey } = require('../services/templateService');

/**
 * POST /templates
 * Body: { key, subject, html_body }
 *
 * Creates a new email template. Placeholders ({{tokens}}) are automatically
 * extracted from html_body and stored in the `placeholders` column.
 */
async function handleCreateTemplate(req, res) {
  const { key, subject, html_body, target_table } = req.body;

  // ── Validate required fields ─────────────────────────────
  const missing = [];
  if (!key)       missing.push('key');
  if (!subject)   missing.push('subject');
  if (!html_body) missing.push('html_body');

  if (missing.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Missing required fields: ${missing.join(', ')}`,
    });
  }

  if (typeof key !== 'string' || !/^[a-z0-9_-]+$/i.test(key)) {
    return res.status(400).json({
      success: false,
      message: 'Template key must be alphanumeric and may contain underscores or hyphens.',
    });
  }

  try {
    const template = await createTemplate({ key, subject, html_body }, target_table || 'email_templates');
    return res.status(201).json({
      success: true,
      message: 'Template created successfully.',
      data: template,
    });
  } catch (err) {
    // Duplicate key (MySQL error 1062)
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: `A template with key "${key}" already exists.`,
      });
    }
    console.error('[Template] createTemplate error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}

/**
 * GET /templates/:key?target_table=email_templates
 * Returns a template by key (useful for inspection / debugging).
 */
async function handleGetTemplate(req, res) {
  const { key } = req.params;
  const target_table = req.query.target_table || 'email_templates';

  try {
    const template = await getTemplateByKey(key, target_table);
    if (!template) {
      return res.status(404).json({ success: false, message: `Template "${key}" not found.` });
    }
    return res.status(200).json({ success: true, data: template });
  } catch (err) {
    console.error('[Template] getTemplate error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}

module.exports = { handleCreateTemplate, handleGetTemplate };