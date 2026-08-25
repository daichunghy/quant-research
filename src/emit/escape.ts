const FORMULA_PREFIX = /^[=+\-@]/;

/**
 * Serialize a string for a CSV consumer, including spreadsheet formula safety.
 * The apostrophe is part of the emitted cell value so spreadsheet applications
 * do not interpret an untrusted text field as a formula.
 */
export function csvEscape(value: string): string {
  const safe = FORMULA_PREFIX.test(value) ? `'${value}` : value;
  if (/[",\r\n]/.test(safe)) {
    return `"${safe.replaceAll('"', '""')}"`;
  }
  return safe;
}

function escapeMarkdownText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\\", "\\\\");
}

export function markdownTableCell(value: string): string {
  return escapeMarkdownText(value)
    .replace(/\r\n?|\n/g, "<br>")
    .replaceAll("|", "\\|");
}

export function markdownInline(value: string): string {
  return escapeMarkdownText(value).replace(/\r\n?|\n/g, " ");
}
