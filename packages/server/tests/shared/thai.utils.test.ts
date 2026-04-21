import { describe, it, expect } from 'vitest';
import {
  getFiscalYear,
  getFiscalYearRange,
  getFiscalQuarter,
  toBuddhistYear,
  formatThaiDate,
  formatThaiDateShort,
  formatThaiMonth,
  getThaiFiscalLabel,
  getFiscalQuarterLabel,
  THAI_MONTHS_SHORT,
} from '../../src/shared/thai.utils';

describe('Thai Utilities', () => {
  describe('Buddhist Year', () => {
    it('converts AD 2026 to BE 2569', () => {
      expect(toBuddhistYear(2026)).toBe(2569);
    });

    it('converts AD 2025 to BE 2568', () => {
      expect(toBuddhistYear(2025)).toBe(2568);
    });
  });

  describe('Fiscal Year', () => {
    it('October belongs to next fiscal year', () => {
      expect(getFiscalYear(new Date('2025-10-01'))).toBe(2569);
    });

    it('September is last month of fiscal year', () => {
      expect(getFiscalYear(new Date('2026-09-15'))).toBe(2569);
    });

    it('January is Q2 of fiscal year', () => {
      expect(getFiscalYear(new Date('2026-01-15'))).toBe(2569);
      expect(getFiscalQuarter(new Date('2026-01-15'))).toBe(2);
    });

    it('returns correct fiscal year range for 2569', () => {
      const range = getFiscalYearRange(2569);
      expect(range.startDate).toBe('2025-10-01');
      expect(range.endDate).toBe('2026-09-30');
    });

    it('returns correct fiscal year range for 2570', () => {
      const range = getFiscalYearRange(2570);
      expect(range.startDate).toBe('2026-10-01');
      expect(range.endDate).toBe('2027-09-30');
    });
  });

  describe('Fiscal Quarter', () => {
    it('Oct-Dec is Q1', () => {
      expect(getFiscalQuarter(new Date('2025-10-01'))).toBe(1);
      expect(getFiscalQuarter(new Date('2025-12-31'))).toBe(1);
    });

    it('Jan-Mar is Q2', () => {
      expect(getFiscalQuarter(new Date('2026-01-01'))).toBe(2);
      expect(getFiscalQuarter(new Date('2026-03-31'))).toBe(2);
    });

    it('Apr-Jun is Q3', () => {
      expect(getFiscalQuarter(new Date('2026-04-01'))).toBe(3);
      expect(getFiscalQuarter(new Date('2026-06-30'))).toBe(3);
    });

    it('Jul-Sep is Q4', () => {
      expect(getFiscalQuarter(new Date('2026-07-01'))).toBe(4);
      expect(getFiscalQuarter(new Date('2026-09-30'))).toBe(4);
    });
  });

  describe('Thai Date Formatting', () => {
    it('formatThaiDate: full format', () => {
      const result = formatThaiDate(new Date('2026-04-21'));
      expect(result).toContain('21');
      expect(result).toContain('เม.ย.');
      expect(result).toContain('2569');
    });

    it('formatThaiDateShort: short format', () => {
      const result = formatThaiDateShort(new Date('2026-04-21'));
      expect(result).toBe('21 เม.ย. 2569');
    });

    it('formatThaiMonth: month + year', () => {
      const result = formatThaiMonth(new Date('2026-04-21'));
      expect(result).toBe('เม.ย. 2569');
    });
  });

  describe('Labels', () => {
    it('getThaiFiscalLabel returns "ปีงบ 2569"', () => {
      expect(getThaiFiscalLabel(2569)).toBe('ปีงบ 2569');
    });

    it('getFiscalQuarterLabel returns correct labels', () => {
      expect(getFiscalQuarterLabel(1)).toBe('ไตรมาสที่ 1 (ต.ค. - ธ.ค.)');
      expect(getFiscalQuarterLabel(2)).toBe('ไตรมาสที่ 2 (ม.ค. - มี.ค.)');
      expect(getFiscalQuarterLabel(3)).toBe('ไตรมาสที่ 3 (เม.ย. - มิ.ย.)');
      expect(getFiscalQuarterLabel(4)).toBe('ไตรมาสที่ 4 (ก.ค. - ก.ย.)');
    });

    it('THAI_MONTHS_SHORT has 12 entries', () => {
      expect(THAI_MONTHS_SHORT).toHaveLength(12);
      expect(THAI_MONTHS_SHORT[0]).toBe('ม.ค.');
      expect(THAI_MONTHS_SHORT[3]).toBe('เม.ย.');
    });
  });
});
