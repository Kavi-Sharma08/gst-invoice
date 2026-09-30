/**
 * Formats a date string or timestamp into a readable date (e.g. "30 Sep 2026")
 */
export function formatDate(dateInput) {
  if (!dateInput) return '—';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(d);
  } catch {
    return String(dateInput);
  }
}

/**
 * Returns today's date formatted as YYYY-MM-DD for HTML date inputs.
 */
export function getTodayInputDate() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks if a given date string is in the current month and year.
 */
export function isThisMonth(dateInput) {
  if (!dateInput) return false;
  try {
    const d = new Date(dateInput);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  } catch {
    return false;
  }
}

/**
 * Returns current Indian financial year string (e.g. "26-27")
 */
export function getCurrentFinancialYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0 is Jan, 3 is April
  // Indian FY is April 1 to March 31
  const startYear = month >= 3 ? year : year - 1;
  const endYear = startYear + 1;
  const startCode = String(startYear).slice(-2);
  const endCode = String(endYear).slice(-2);
  return `${startCode}-${endCode}`;
}
