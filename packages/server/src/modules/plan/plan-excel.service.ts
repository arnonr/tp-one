import ExcelJS from 'exceljs';
import type { PlanExportData } from './types';

const C = {
  title: 'FF1E3A5F',
  section: 'FF475569',
  header: 'FF1E3A5F',
  headerText: 'FFFFFFFF',
  altRow: 'FFF1F5F9',
  white: 'FFFFFFFF',
  border: 'FFCBD5E1',
  text: 'FF334155',
  success: 'FF10B981',
  warning: 'FFF59E0B',
  info: 'FF3B82F6',
  danger: 'FFEF4444',
  muted: 'FF94A3B8',
};

function hCell(cell: ExcelJS.Cell, text: string, opts: { align?: 'left' | 'center' | 'right'; size?: number } = {}) {
  cell.value = text;
  cell.font = { bold: true, color: { argb: C.headerText }, size: opts.size || 10 };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.header } };
  cell.alignment = { horizontal: opts.align || 'center', vertical: 'middle' };
  cell.border = {
    top: { style: 'medium', color: { argb: C.header } },
    bottom: { style: 'medium', color: { argb: C.header } },
    left: { style: 'thin', color: { argb: C.header } },
    right: { style: 'thin', color: { argb: C.header } },
  };
}

function dCell(cell: ExcelJS.Cell, value: any, opts: { bold?: boolean; color?: string; size?: number; align?: 'left' | 'center' | 'right' } = {}) {
  cell.value = value;
  cell.font = { bold: opts.bold || false, color: { argb: opts.color || C.text }, size: opts.size || 10 };
  cell.alignment = { horizontal: opts.align || 'left', vertical: 'middle' };
  cell.border = {
    top: { style: 'thin', color: { argb: C.border } },
    bottom: { style: 'thin', color: { argb: C.border } },
    left: { style: 'thin', color: { argb: C.border } },
    right: { style: 'thin', color: { argb: C.border } },
  };
}

function bgFill(color: string) {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
}

function titleBar(ws: ExcelJS.Worksheet, rowNum: number, text: string, cols: number) {
  ws.mergeCells(rowNum, 1, rowNum, cols);
  const cell = ws.getCell(rowNum, 1);
  cell.value = text;
  cell.font = { bold: true, size: 14, color: { argb: C.headerText } };
  cell.fill = bgFill(C.title);
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(rowNum).height = 36;
}

function sectionBar(ws: ExcelJS.Worksheet, rowNum: number, text: string, cols: number) {
  ws.mergeCells(rowNum, 1, rowNum, cols);
  const cell = ws.getCell(rowNum, 1);
  cell.value = text;
  cell.font = { bold: true, size: 11, color: { argb: C.headerText } };
  cell.fill = bgFill(C.section);
  cell.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getRow(rowNum).height = 26;
}

function toThaiNumber(num: number): string {
  const digits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
  return num.toString().split('').map(d => digits[parseInt(d)] || d).join('');
}

function progressColor(pct: number): string {
  if (pct >= 80) return C.success;
  if (pct >= 50) return C.info;
  if (pct >= 25) return C.warning;
  return C.danger;
}

const FISCAL_QUARTERS: Record<number, { label: string; months: number[] }> = {
  1: { label: 'ไตรมาสที่ 1 (ต.ค.-ธ.ค.)', months: [10, 11, 12] },
  2: { label: 'ไตรมาสที่ 2 (ม.ค.-มี.ค.)', months: [1, 2, 3] },
  3: { label: 'ไตรมาสที่ 3 (เม.ย.-มิ.ย.)', months: [4, 5, 6] },
  4: { label: 'ไตรมาสที่ 4 (ก.ค.-ก.ย.)', months: [7, 8, 9] },
};

const THAI_MONTHS: Record<number, string> = {
  1: 'ม.ค.', 2: 'ก.พ.', 3: 'มี.ค.',
  4: 'เม.ย.', 5: 'พ.ค.', 6: 'มิ.ย.',
  7: 'ก.ค.', 8: 'ส.ค.', 9: 'ก.ย.',
  10: 'ต.ค.', 11: 'พ.ย.', 12: 'ธ.ค.',
};

export async function generatePlanExcel(data: PlanExportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'TP-One';
  wb.created = new Date();

  const { plan, progress, monthlyUpdates } = data;
  const fiscalYearThai = toThaiNumber(plan.year);

  // ── Sheet 1: สรุปภาพรวม ────────────────────────────────
  const sws = wb.addWorksheet('สรุปภาพรวม');
  const sCols = 6;

  titleBar(sws, 1, `  ${plan.name} — ปีงบประมาณ ${fiscalYearThai}`, sCols);

  sws.columns = [
    { key: 'a', width: 22 },
    { key: 'b', width: 16 },
    { key: 'c', width: 14 },
    { key: 'd', width: 16 },
    { key: 'e', width: 14 },
    { key: 'f', width: 16 },
  ];

  // Overall progress
  const overallPct = Math.round(progress.overallProgress);
  sectionBar(sws, 2, '  ภาพรวม', sCols);
  let r = 3;
  const overviewData = [
    ['ชื่อแผน', plan.name, '', 'ความก้าวหน้าโดยรวม', `${overallPct}%`],
    ['ปีงบประมาณ', fiscalYearThai, '', 'สถานะ', plan.status],
    ['จำนวนยุทธศาสตร์', toThaiNumber(progress.strategies.length), '', '', ''],
  ];
  for (const row of overviewData) {
    const x = sws.getRow(r);
    x.height = 24;
    dCell(x.getCell(1), row[0], { bold: true });
    dCell(x.getCell(2), row[1], { color: row[0].includes('ก้าวหน้า') ? progressColor(overallPct) : undefined });
    dCell(x.getCell(3), row[2]);
    if (row[3]) {
      dCell(x.getCell(4), row[3], { bold: true });
      dCell(x.getCell(5), row[4], { color: row[3].includes('ก้าวหน้า') ? progressColor(overallPct) : undefined, bold: true, size: 12 });
    }
    if ((r - 3) % 2 === 0) {
      [1, 2, 3, 4, 5, 6].forEach(c => x.getCell(c).fill = bgFill(C.altRow));
    }
    r++;
  }

  // Strategy summary
  r += 1;
  sectionBar(sws, r, '  สรุปตามยุทธศาสตร์', sCols);
  r++;

  const sHeader = sws.getRow(r);
  sHeader.height = 24;
  ['ยุทธศาสตร์', 'จำนวนเป้าหมาย', 'จำนวนตัวชี้วัด', 'น้ำหนักรวม', '', 'ความก้าวหน้า'].forEach((h, i) => {
    hCell(sHeader.getCell(i + 1), h, { size: 10 });
  });
  r++;

  for (let i = 0; i < progress.strategies.length; i++) {
    const strat = progress.strategies[i];
    const x = sws.getRow(r);
    x.height = 22;
    const stratPct = Math.round(strat.weightedProgress);
    const totalIndicators = strat.goals.reduce((s, g) => s + g.indicators.length, 0);

    dCell(x.getCell(1), `${strat.strategyCode} ${strat.strategyName}`, { bold: true });
    dCell(x.getCell(2), strat.goals.length, { align: 'center' });
    dCell(x.getCell(3), totalIndicators, { align: 'center' });
    dCell(x.getCell(4), parseFloat(strat.totalWeight.toFixed(1)), { align: 'center' });
    dCell(x.getCell(5), '');
    dCell(x.getCell(6), `${stratPct}%`, { align: 'center', bold: true, color: progressColor(stratPct), size: 12 });

    if (i % 2 === 0) [1, 2, 3, 4, 5, 6].forEach(c => x.getCell(c).fill = bgFill(C.altRow));
    r++;
  }

  sws.views = [{ state: 'frozen', xSplit: 0, ySplit: 2 }];

  // ── Sheet 2: รายไตรมาส ─────────────────────────────────
  const qws = wb.addWorksheet('รายไตรมาส');
  const qCols = 7;

  titleBar(qws, 1, `  รายงานตามไตรมาส ปีงบประมาณ ${fiscalYearThai}`, qCols);

  qws.columns = [
    { key: 'a', width: 20 },
    { key: 'b', width: 14 },
    { key: 'c', width: 30 },
    { key: 'd', width: 14 },
    { key: 'e', width: 14 },
    { key: 'f', width: 12 },
    { key: 'g', width: 16 },
  ];

  r = 2;

  for (const [qNum, qInfo] of Object.entries(FISCAL_QUARTERS)) {
    sectionBar(qws, r, `  ${qInfo.label}`, qCols);
    r++;

    const qHeader = qws.getRow(r);
    qHeader.height = 24;
    ['รหัส', 'เดือน', 'ตัวชี้วัด', 'เป้าหมาย', 'ปัจจุบัน', 'น้ำหนัก', 'ความก้าวหน้า'].forEach((h, i) => {
      hCell(qHeader.getCell(i + 1), h, { size: 10 });
    });
    r++;

    const qUpdates = monthlyUpdates.filter(u => qInfo.months.includes(u.month));
    if (qUpdates.length === 0) {
      const x = qws.getRow(r);
      x.height = 22;
      sws.mergeCells(r, 1, r, qCols);
      dCell(x.getCell(1), 'ไม่มีข้อมูล', { align: 'center', color: C.muted });
      r++;
    } else {
      for (let i = 0; i < qUpdates.length; i++) {
        const u = qUpdates[i];
        const x = qws.getRow(r);
        x.height = 22;
        const monthName = THAI_MONTHS[u.month] || '';

        dCell(x.getCell(1), u.indicatorCode, { align: 'center' });
        dCell(x.getCell(2), monthName, { align: 'center' });
        dCell(x.getCell(3), u.indicatorName);
        dCell(x.getCell(4), u.targetValue, { align: 'center' });
        dCell(x.getCell(5), u.reportedValue, { align: 'center' });
        dCell(x.getCell(6), '', { align: 'center' });
        dCell(x.getCell(7), `${Math.round(u.progressPct)}%`, {
          align: 'center', bold: true, color: progressColor(u.progressPct), size: 11,
        });

        if (i % 2 === 0) [1, 2, 3, 4, 5, 6, 7].forEach(c => x.getCell(c).fill = bgFill(C.altRow));
        r++;
      }
    }

    r++; // gap between quarters
  }

  qws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

  // ── Sheet 3: รายละเอียดตัวชี้วัด ───────────────────────
  const dws = wb.addWorksheet('รายละเอียดตัวชี้วัด');
  const dCols = 8;

  titleBar(dws, 1, `  รายละเอียดตัวชี้วัด — ${plan.name}`, dCols);

  dws.columns = [
    { key: 'a', width: 14 },
    { key: 'b', width: 14 },
    { key: 'c', width: 14 },
    { key: 'd', width: 30 },
    { key: 'e', width: 14 },
    { key: 'f', width: 12 },
    { key: 'g', width: 14 },
    { key: 'h', width: 14 },
  ];

  const dHeader = dws.getRow(2);
  dHeader.height = 24;
  ['ยุทธศาสตร์', 'เป้าหมาย', 'รหัส', 'ตัวชี้วัด', 'เป้าหมาย', 'หน่วย', 'ปัจจุบัน', 'ความก้าวหน้า'].forEach((h, i) => {
    hCell(dHeader.getCell(i + 1), h, { size: 10 });
  });

  r = 3;
  for (const strat of progress.strategies) {
    for (const goal of strat.goals) {
      for (let i = 0; i < goal.indicators.length; i++) {
        const ind = goal.indicators[i];
        const x = dws.getRow(r);
        x.height = 22;
        const indPct = Math.round(ind.latestProgressPct ?? 0);

        dCell(x.getCell(1), strat.strategyCode, { align: 'center' });
        dCell(x.getCell(2), goal.goalCode, { align: 'center' });
        dCell(x.getCell(3), ind.indicatorCode, { align: 'center' });
        dCell(x.getCell(4), ind.indicatorName);
        dCell(x.getCell(5), parseFloat(ind.targetValue), { align: 'center' });
        dCell(x.getCell(6), ind.unit || '-', { align: 'center' });
        dCell(x.getCell(7), ind.latestValue ? parseFloat(ind.latestValue) : '-', { align: 'center' });
        dCell(x.getCell(8), `${indPct}%`, {
          align: 'center', bold: true, color: progressColor(indPct), size: 11,
        });

        if (i % 2 === 0) [1, 2, 3, 4, 5, 6, 7, 8].forEach(c => x.getCell(c).fill = bgFill(C.altRow));
        r++;
      }
    }
  }

  dws.views = [{ state: 'frozen', xSplit: 0, ySplit: 2 }];

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
