/**
 * Value and date formatters used across Dashboard views.
 */

/**
 * Compact currency formatter in thousands / lakhs.
 * Example: 150000 -> ₹1.5L, 2500 -> ₹3k, 850 -> ₹850
 */
export function formatShortK(n) {
  const num = Number(n || 0);
  if (num >= 1e5) return '₹' + (num / 1e5).toFixed(1).replace('.0', '') + 'L';
  if (num >= 1e3) return '₹' + Math.round(num / 1e3) + 'k';
  return '₹' + Math.round(num);
}

/**
 * Formats a date into DD/MM/YYYY.
 */
export function formatDDMMYYYY(dateInput) {
  if (!dateInput) return '—';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateInput);
  }
}
