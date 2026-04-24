export const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
] as const;

export const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
] as const;

export const FISCAL_QUARTER_RANGES = [
  { label: 'ไตรมาสที่ 1 (ต.ค. - ธ.ค.)', months: 'ต.ค. - ธ.ค.', startMonth: 10, endMonth: 12 },
  { label: 'ไตรมาสที่ 2 (ม.ค. - มี.ค.)', months: 'ม.ค. - มี.ค.', startMonth: 1, endMonth: 3 },
  { label: 'ไตรมาสที่ 3 (เม.ย. - มิ.ย.)', months: 'เม.ย. - มิ.ย.', startMonth: 4, endMonth: 6 },
  { label: 'ไตรมาสที่ 4 (ก.ค. - ก.ย.)', months: 'ก.ค. - ก.ย.', startMonth: 7, endMonth: 9 },
] as const;

export function toBuddhistYear(adYear: number): number {
  return adYear + 543;
}

export function toADYear(beYear: number): number {
  return beYear - 543;
}

export function getFiscalYear(date: Date): number {
  const adYear = date.getFullYear();
  const month = date.getMonth() + 1;
  if (month >= 10) {
    return toBuddhistYear(adYear + 1);
  }
  return toBuddhistYear(adYear);
}

export function getCurrentFiscalYear(): number {
  return getFiscalYear(new Date());
}

export function getFiscalYearRange(fiscalYear: number): { startDate: string; endDate: string } {
  const adYear = toADYear(fiscalYear);
  return {
    startDate: `${adYear - 1}-10-01`,
    endDate: `${adYear}-09-30`,
  };
}

export function getFiscalQuarter(date: Date): number {
  const month = date.getMonth() + 1;
  if (month >= 10) return 1;
  if (month >= 7) return 4;
  if (month >= 4) return 3;
  return 2;
}

export function getFiscalQuarterLabel(quarter: 1 | 2 | 3 | 4): string {
  return FISCAL_QUARTER_RANGES[quarter - 1].label;
}

export function formatThaiDate(date: Date): string {
  const day = date.getDate();
  const month = THAI_MONTHS_SHORT[date.getMonth()];
  const year = toBuddhistYear(date.getFullYear());
  return `${day} ${month} ${year}`;
}

export function formatThaiDateShort(date: Date): string {
  const day = date.getDate();
  const month = THAI_MONTHS_SHORT[date.getMonth()];
  const year = toBuddhistYear(date.getFullYear());
  return `${day} ${month} ${year}`;
}

export function formatThaiDateFull(date: Date): string {
  const day = date.getDate();
  const month = THAI_MONTHS_FULL[date.getMonth()];
  const year = toBuddhistYear(date.getFullYear());
  return `${day} ${month} ${year}`;
}

export function formatThaiMonth(date: Date): string {
  const month = THAI_MONTHS_SHORT[date.getMonth()];
  const year = toBuddhistYear(date.getFullYear());
  return `${month} ${year}`;
}

export function getThaiFiscalLabel(fiscalYear: number): string {
  return `ปีงบ ${fiscalYear}`;
}

export function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function formatThaiNumber(value: number): string {
  return value.toLocaleString('th-TH');
}

export function formatThaiCurrency(value: number): string {
  return `${value.toLocaleString('th-TH')} บาท`;
}

export function getFiscalYearList(currentFiscalYear: number, yearsBack: number = 3, yearsForward: number = 1): number[] {
  const years: number[] = [];
  for (let y = currentFiscalYear - yearsBack; y <= currentFiscalYear + yearsForward; y++) {
    years.push(y);
  }
  return years;
}
