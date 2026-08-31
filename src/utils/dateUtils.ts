/**
 * Utility functions for formatting dates and timestamps in Indian Standard Time (IST / Asia/Kolkata).
 */

/**
 * Formats a timestamp (ISO string or Date) into Indian Standard Time date and time string.
 * e.g., "28/08/2026, 11:32:16 AM" or "28/08/2026, 11:32 AM"
 */
export const formatDateTime = (
  dateInput: string | Date | null | undefined,
  includeSeconds: boolean = true
): string => {
  if (!dateInput) return '-';
  let str = String(dateInput).trim();
  if (!str) return '-';

  const date = new Date(str);
  if (isNaN(date.getTime())) return str;

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
};

/**
 * Formats a date string into Indian format DD/MM/YYYY.
 */
export const formatDate = (dateInput: string | Date | null | undefined): string => {
  if (!dateInput) return '-';
  const str = String(dateInput).trim();
  if (!str) return '-';

  // For YYYY-MM-DD string inputs from date pickers or pure dates
  const cleanStr = str.split('T')[0];
  const parts = cleanStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }

  const date = new Date(str);
  if (isNaN(date.getTime())) return str;

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
};
