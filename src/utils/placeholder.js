const PLACEHOLDER_REGEX = /\{\{\s*(\w+)\s*\}\}/g;

/**
 * Scans an HTML string and returns every unique {{token}} name found.
 * e.g. "<p>Hello {{name}}, click {{reset_link}}</p>"
 *   => ["name", "reset_link"]
 */
function extractPlaceholders(html) {
  const found = new Set();
  let match;
  const re = new RegExp(PLACEHOLDER_REGEX.source, 'g');
  while ((match = re.exec(html)) !== null) {
    found.add(match[1]);
  }
  return Array.from(found);
}

/**
 * Replaces every {{token}} in html with the corresponding value from `values`.
 * Tokens with no matching value are left as-is.
 */
function substitutePlaceholders(html, values = {}) {
  return html.replace(new RegExp(PLACEHOLDER_REGEX.source, 'g'), (_, key) => {
    return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : `{{${key}}}`;
  });
}

/**
 * Checks that every placeholder in `required` exists as a key in `supplied`.
 * Returns an array of missing placeholder names (empty = all good).
 */
function findMissingPlaceholders(required = [], supplied = {}) {
  return required.filter((p) => !Object.prototype.hasOwnProperty.call(supplied, p));
}

module.exports = { extractPlaceholders, substitutePlaceholders, findMissingPlaceholders };