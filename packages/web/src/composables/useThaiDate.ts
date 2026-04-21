import { formatThaiDate, formatThaiDateFull, formatThaiMonth, relativeTime, daysUntil } from '../utils/thai';

export function useThaiDate() {
  return {
    formatShort: formatThaiDate,
    formatFull: formatThaiDateFull,
    formatMonth: formatThaiMonth,
    relative: relativeTime,
    daysUntil,
  };
}
