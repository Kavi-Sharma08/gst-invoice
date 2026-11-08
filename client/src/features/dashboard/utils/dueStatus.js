/**
 * Due date status and GSTR-1 calendar reminder helpers.
 */

/**
 * Calculates due status (Overdue, Due today, Due in N days) and styling classes.
 */
export function getDueStatus(dueDate, now = new Date()) {
  if (!dueDate) return { label: 'Due', className: 'text-muted' };
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const targetDate = new Date(dueDate);
  const targetMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();

  const diffMs = targetMidnight - todayMidnight;
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    return {
      label: `Overdue by ${absDays} ${absDays === 1 ? 'day' : 'days'}`,
      className: 'text-danger font-medium',
    };
  }
  if (diffDays === 0) {
    return {
      label: 'Due today',
      className: 'text-amber-500 font-medium',
    };
  }
  return {
    label: `Due in ${diffDays} ${diffDays === 1 ? 'day' : 'days'}`,
    className: 'text-amber-500 font-medium',
  };
}

/**
 * Generates GSTR-1 due date notice for the current month.
 * In India, GSTR-1 for month M is due on 11th of month M+1.
 */
export function getGstr1Reminder(now = new Date()) {
  const curMonthName = now.toLocaleDateString('en-IN', { month: 'long' });
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 11);
  const nextMonthName = nextMonthDate.toLocaleDateString('en-IN', { month: 'short' });
  return `GSTR-1 for ${curMonthName} is due on 11 ${nextMonthName}`;
}
