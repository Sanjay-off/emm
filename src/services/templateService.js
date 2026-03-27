const db = require('../config/db');
const { extractPlaceholders } = require('../utils/placeholder');

/**
 * Creates a new email template.
 * Automatically extracts {{placeholders}} from html_body and stores them.
 */
async function createTemplate({ key, subject, html_body }, template_table = 'email_templates') {
  if (!/^[a-zA-Z0-9_]+$/.test(template_table)) {
    throw new Error(`Invalid table name: "${template_table}"`);
  }

  const placeholders = extractPlaceholders(html_body);

  const [result] = await db.execute(
    `INSERT INTO ${template_table} (\`key\`, subject, html_body, placeholders) VALUES (?, ?, ?, ?)`,
    [key, subject, html_body, JSON.stringify(placeholders)]
  );

  return {
    id:           result.insertId,
    key,
    subject,
    placeholders,
  };
}

/**
 * Fetches a template by its key.
 * Returns null if not found.
 */
async function getTemplateByKey(key, template_table = 'email_templates') {
  if (!/^[a-zA-Z0-9_]+$/.test(template_table)) {
    throw new Error(`Invalid table name: "${template_table}"`);
  }

  const [rows] = await db.execute(
    `SELECT * FROM ${template_table} WHERE \`key\` = ?`,
    [key]
  );

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    ...row,
    // mysql2 may return JSON columns as a string depending on driver version
    placeholders: typeof row.placeholders === 'string'
      ? JSON.parse(row.placeholders)
      : row.placeholders,
  };
}

module.exports = { createTemplate, getTemplateByKey };