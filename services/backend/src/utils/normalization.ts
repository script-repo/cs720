import crypto from 'crypto';

/**
 * Normalize account name according to spec:
 * - lowercase
 * - trim whitespace
 * - remove trailing company suffixes: ", (inc|corp|ltd|llc)."
 * - collapse multiple spaces
 * - remove trailing punctuation
 */
export function normalizeAccountName(name: string): string {
  if (!name) return '';

  let normalized = name.toLowerCase().trim();

  // Remove common company suffixes
  normalized = normalized.replace(/,?\s*(inc|corp|ltd|llc|limited|incorporated|corporation)\.?$/i, '');

  // Collapse multiple spaces
  normalized = normalized.replace(/\s+/g, ' ');

  // Remove trailing punctuation
  normalized = normalized.replace(/[.,;:!?]+$/, '');

  // Final trim
  normalized = normalized.trim();

  return normalized;
}

/**
 * Generate a deterministic ID from concatenated fields
 */
export function generateId(...fields: (string | number | null | undefined)[]): string {
  const concatenated = fields
    .map(f => f === null || f === undefined ? '' : String(f))
    .join('|');

  return crypto.createHash('sha1').update(concatenated).digest('hex').substring(0, 16);
}

/**
 * Parse date from various formats to ISO string
 */
export function normalizeDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  } catch {
    return null;
  }
}

/**
 * Parse datetime from various formats to ISO string
 */
export function normalizeDatetime(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.toISOString(); // YYYY-MM-DDTHH:mm:ss.sssZ
  } catch {
    return null;
  }
}

/**
 * Parse number, removing thousands separators
 */
export function normalizeNumber(numStr: string | number | null | undefined): number | null {
  if (numStr === null || numStr === undefined) return null;
  if (typeof numStr === 'number') return numStr;

  // Remove thousands separators (comma, space)
  const cleaned = String(numStr).replace(/[,\s]/g, '');
  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? null : parsed;
}

/**
 * Normalize column name to snake_case
 */
export function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Extract cluster UUID from various column names
 */
export function extractClusterUuid(row: Record<string, any>): string | null {
  const possibleKeys = [
    'cluster_uuid',
    'clusteruuid',
    'uuid',
    'cluster_id',
    'clusterid'
  ];

  for (const key of possibleKeys) {
    const value = row[key];
    if (value && typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

/**
 * Extract account name from various column names
 */
export function extractAccountName(row: Record<string, any>): string | null {
  const possibleKeys = [
    'account_name',
    'accountname',
    'customer_name',
    'customername',
    'account',
    'customer'
  ];

  for (const key of possibleKeys) {
    const value = row[key];
    if (value && typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

export default {
  normalizeAccountName,
  generateId,
  normalizeDate,
  normalizeDatetime,
  normalizeNumber,
  normalizeColumnName,
  extractClusterUuid,
  extractAccountName
};
