export const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
] as const;

export const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
] as const;

export const THAI_DAYS_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'] as const;

export function toBE(adYear: number): number {
  return adYear + 543;
}

export function toAD(beYear: number): number {
  return beYear - 543;
}

export function formatThaiDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${toBE(d.getFullYear())}`;
}

export function formatThaiDateFull(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${d.getDate()} ${THAI_MONTHS_FULL[d.getMonth()]} ${toBE(d.getFullYear())}`;
}

export function formatThaiMonth(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${THAI_MONTHS_SHORT[d.getMonth()]} ${toBE(d.getFullYear())}`;
}

export function formatThaiDateTime(iso: string): string {
  const d = new Date(iso);
  d.setHours(d.getHours() + 7); // convert UTC to Bangkok time (+7)
  return `${d.getDate().toString().padStart(2, '0')} ${THAI_MONTHS_SHORT[d.getMonth()]} ${toBE(d.getFullYear())} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export function getFiscalYear(date: Date = new Date()): number {
  const month = date.getMonth() + 1;
  if (month >= 10) return toBE(date.getFullYear() + 1);
  return toBE(date.getFullYear());
}

export function getFiscalYearRange(fiscalYear: number) {
  const adYear = toAD(fiscalYear);
  return { start: new Date(adYear - 1, 9, 1), end: new Date(adYear, 8, 30) };
}

export function getFiscalQuarter(date: Date = new Date()): number {
  const month = date.getMonth() + 1;
  if (month >= 10) return 1;
  if (month >= 7) return 4;
  if (month >= 4) return 3;
  return 2;
}

export const FISCAL_QUARTER_LABELS: Record<number, string> = {
  1: 'ไตรมาสที่ 1 (ต.ค. - ธ.ค.)',
  2: 'ไตรมาสที่ 2 (ม.ค. - มี.ค.)',
  3: 'ไตรมาสที่ 3 (เม.ย. - มิ.ย.)',
  4: 'ไตรมาสที่ 4 (ก.ค. - ก.ย.)',
};

export function formatNumber(value: number): string {
  return value.toLocaleString('th-TH');
}

export function formatCurrency(value: number): string {
  return `${value.toLocaleString('th-TH')} บาท`;
}

export function daysUntil(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function relativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diff = daysUntil(d);
  if (diff === 0) return 'วันนี้';
  if (diff === 1) return 'พรุ่งนี้';
  if (diff === -1) return 'เมื่อวาน';
  if (diff > 0 && diff <= 7) return `อีก ${diff} วัน`;
  if (diff < 0) return `เลย ${Math.abs(diff)} วัน`;
  return formatThaiDate(d);
}
