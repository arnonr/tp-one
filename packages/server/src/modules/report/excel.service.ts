import ExcelJS from 'exceljs';
import type { ReportSummary } from './report.service';

// Color palette (ARGB format - Alpha + RGB)
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
  purple: 'FF8B5CF6',
  muted: 'FF94A3B8',
};

function hCell(cell: ExcelJS.Cell, text: string, opts: { align?: 'left' | 'center' | 'right'; size?: number } = {}) {
  cell.value = text;
  cell.font = { bold: true, color: { argb: C.headerText }, size: opts.size || 11 };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.header } };
  cell.alignment = { horizontal: opts.align || 'center', vertical: 'middle' };
  cell.border = {
    top: { style: 'medium', color: { argb: 'FF1E3A5F' } },
    bottom: { style: 'medium', color: { argb: 'FF1E3A5F' } },
    left: { style: 'thin', color: { argb: 'FF1E3A5F' } },
    right: { style: 'thin', color: { argb: 'FF1E3A5F' } },
  };
}

function dCell(cell: ExcelJS.Cell, value: any, opts: { bold?: boolean; color?: string; size?: number; align?: 'left' | 'center' | 'right' } = {}) {
  cell.value = value;
  cell.font = { bold: opts.bold || false, color: { argb: opts.color || C.text }, size: opts.size || 11 };
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
  cell.font = { bold: true, size: 16, color: { argb: C.headerText } };
  cell.fill = bgFill(C.title);
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(rowNum).height = 36;
}

function sectionBar(ws: ExcelJS.Worksheet, rowNum: number, text: string, cols: number) {
  ws.mergeCells(rowNum, 1, rowNum, cols);
  const cell = ws.getCell(rowNum, 1);
  cell.value = text;
  cell.font = { bold: true, size: 12, color: { argb: C.headerText } };
  cell.fill = bgFill(C.section);
  cell.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getRow(rowNum).height = 26;
}

function toThaiNumber(num: number): string {
  const digits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
  return num.toString().split('').map(d => digits[parseInt(d)] || d).join('');
}

export async function generateSummaryExcel(data: ReportSummary): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'TP-One';
  wb.created = new Date();

  // ── Sheet 1: Summary ──────────────────────────────────────
  const sws = wb.addWorksheet('สรุปภาพรวม');

  titleBar(sws, 1, `  รายงานสรุปภาพรวม ปีงบประมาณ ${toThaiNumber(data.fiscalYear)}`, 4);

  sws.columns = [
    { header: 'รายการ', key: 'a', width: 30 },
    { header: 'จำนวน', key: 'b', width: 16 },
    { header: 'หน่วย', key: 'c', width: 12 },
    { header: 'หมายเหตุ', key: 'd', width: 14 },
  ];

  // Section: สถานะงาน
  sectionBar(sws, 2, '  สถานะงาน', 4);

  const statusData = [
    { label: 'งานทั้งหมด', value: data.totalTasks, unit: 'งาน', color: C.info },
    { label: 'เสร็จสิ้น', value: data.tasksByStatusType.completed, unit: 'งาน', color: C.success },
    { label: 'อยู่ระหว่างทำ', value: data.tasksByStatusType.in_progress, unit: 'งาน', color: C.info },
    { label: 'อยู่ระหว่างตรวจ', value: data.tasksByStatusType.review, unit: 'งาน', color: C.purple },
    { label: 'รอทำ', value: data.tasksByStatusType.pending, unit: 'งาน', color: C.warning },
  ];

  statusData.forEach((s, i) => {
    const row = sws.getRow(i + 3);
    row.height = 24;
    dCell(row.getCell(1), s.label, { bold: true });
    dCell(row.getCell(2), s.value, { align: 'center', color: s.color, bold: true });
    dCell(row.getCell(3), s.unit, { align: 'center' });
    dCell(row.getCell(4), '', {});
    if (i % 2 === 0) {
      [1, 2, 3, 4].forEach(c => row.getCell(c).fill = bgFill(C.altRow));
    }
  });

  // Section: สถานะโครงการ
  const projRow = statusData.length + 5;
  sectionBar(sws, projRow, '  สถานะโครงการ', 4);

  const projData = [
    { label: 'โครงการทั้งหมด', value: data.projectStats.total, unit: 'โครงการ', color: C.purple },
    { label: 'กำลังดำเนินการ', value: data.projectStats.inProgress, unit: 'โครงการ', color: C.info },
    { label: 'เสร็จสิ้น', value: data.projectStats.completed, unit: 'โครงการ', color: C.success },
  ];

  projData.forEach((s, i) => {
    const row = sws.getRow(projRow + 1 + i);
    row.height = 24;
    dCell(row.getCell(1), s.label, { bold: true });
    dCell(row.getCell(2), s.value, { align: 'center', color: s.color, bold: true });
    dCell(row.getCell(3), s.unit, { align: 'center' });
    dCell(row.getCell(4), '', {});
    if (i % 2 === 0) {
      [1, 2, 3, 4].forEach(c => row.getCell(c).fill = bgFill(C.altRow));
    }
  });

  // Success rate summary row
  const pct = data.totalTasks > 0 ? Math.round((data.tasksByStatusType.completed / data.totalTasks) * 100) : 0;
  const summaryRow = projRow + projData.length + 2;
  sws.mergeCells(summaryRow, 1, summaryRow, 2);
  const sumCell = sws.getCell(summaryRow, 1);
  sumCell.value = `อัตราความสำเร็จโดยรวม`;
  sumCell.font = { bold: true, size: 12, color: { argb: C.muted } };
  sumCell.alignment = { horizontal: 'right', vertical: 'middle' };

  const pctCell = sws.getCell(summaryRow, 3);
  pctCell.value = `${pct}%`;
  pctCell.font = { bold: true, size: 18, color: { argb: C.success } };
  pctCell.alignment = { horizontal: 'center', vertical: 'middle' };
  pctCell.fill = bgFill('FFF0FDF4');
  pctCell.border = {
    top: { style: 'medium', color: { argb: C.success } },
    bottom: { style: 'medium', color: { argb: C.success } },
    left: { style: 'medium', color: { argb: C.success } },
    right: { style: 'medium', color: { argb: C.success } },
  };
  sws.getCell(summaryRow, 4).value = '';
  sws.getRow(summaryRow).height = 32;

  sws.views = [{ state: 'frozen', xSplit: 0, ySplit: 2 }];

  // ── Sheet 2: Monthly ───────────────────────────────────────
  const mws = wb.addWorksheet('รายเดือน');

  titleBar(mws, 1, `  สถานะงานรายเดือน ปีงบ ${toThaiNumber(data.fiscalYear)}`, 4);

  mws.columns = [
    { header: 'เดือน', key: 'a', width: 18 },
    { header: 'สร้างใหม่', key: 'b', width: 16 },
    { header: 'เสร็จสิ้น', key: 'c', width: 16 },
    { header: 'คงเหลือ', key: 'd', width: 14 },
  ];

  const mHeader = mws.getRow(2);
  mHeader.height = 28;
  ['เดือน', 'สร้างใหม่', 'เสร็จสิ้น', 'คงเหลือ'].forEach((h, i) => {
    hCell(mHeader.getCell(i + 1), h, { size: 12 });
  });

  data.monthlyData.forEach((m, i) => {
    const row = mws.getRow(i + 3);
    row.height = 22;
    const fill = i % 2 === 0 ? C.altRow : C.white;
    dCell(row.getCell(1), m.month, { bold: true });
    dCell(row.getCell(2), m.created, { align: 'center' });
    dCell(row.getCell(3), m.completed, { align: 'center', color: C.success });
    dCell(row.getCell(4), m.created - m.completed, { align: 'center', color: C.warning });
    [1, 2, 3, 4].forEach(c => row.getCell(c).fill = bgFill(fill));
  });

  // Totals row
  const totalRow = data.monthlyData.length + 3;
  mws.getRow(totalRow).height = 26;
  dCell(mws.getCell(totalRow, 1), 'รวมทั้งหมด', { bold: true, size: 12 });
  dCell(mws.getCell(totalRow, 2), data.monthlyData.reduce((s, m) => s + m.created, 0), { bold: true, align: 'center', size: 12 });
  dCell(mws.getCell(totalRow, 3), data.monthlyData.reduce((s, m) => s + m.completed, 0), { bold: true, align: 'center', size: 12, color: C.success });
  dCell(mws.getCell(totalRow, 4), data.monthlyData.reduce((s, m) => s + (m.created - m.completed), 0), { bold: true, align: 'center', size: 12, color: C.warning });
  [1, 2, 3, 4].forEach(c => {
    const cell = mws.getCell(totalRow, c);
    cell.fill = bgFill(C.title);
    cell.font = { bold: true, size: 12, color: { argb: C.headerText } };
    cell.border = {
      top: { style: 'medium', color: { argb: C.title } },
      bottom: { style: 'medium', color: { argb: C.title } },
      left: { style: 'thin', color: { argb: C.title } },
      right: { style: 'thin', color: { argb: C.title } },
    };
  });

  mws.views = [{ state: 'frozen', xSplit: 0, ySplit: 2 }];

  // ── Sheet 3: Quarterly ────────────────────────────────────
  const qws = wb.addWorksheet('รายไตรมาส');

  titleBar(qws, 1, `  สถานะงานรายไตรมาส ปีงบ ${toThaiNumber(data.fiscalYear)}`, 4);

  qws.columns = [
    { header: 'ไตรมาส', key: 'a', width: 20 },
    { header: 'สร้างใหม่', key: 'b', width: 16 },
    { header: 'เสร็จสิ้น', key: 'c', width: 16 },
    { header: 'รอทำ', key: 'd', width: 14 },
  ];

  const qHeader = qws.getRow(2);
  qHeader.height = 28;
  ['ไตรมาส', 'สร้างใหม่', 'เสร็จสิ้น', 'รอทำ'].forEach((h, i) => {
    hCell(qHeader.getCell(i + 1), h, { size: 12 });
  });

  data.quarterlyData.forEach((q, i) => {
    const row = qws.getRow(i + 3);
    row.height = 22;
    const fill = i % 2 === 0 ? C.altRow : C.white;
    dCell(row.getCell(1), q.label, { bold: true });
    dCell(row.getCell(2), q.created, { align: 'center' });
    dCell(row.getCell(3), q.completed, { align: 'center', color: C.success });
    dCell(row.getCell(4), q.pending, { align: 'center', color: C.warning });
    [1, 2, 3, 4].forEach(c => row.getCell(c).fill = bgFill(fill));
  });

  qws.views = [{ state: 'frozen', xSplit: 0, ySplit: 2 }];

  // ── Sheet 4: By Workspace ──────────────────────────────────
  if (data.tasksByWorkspace.length > 0) {
    const wws = wb.addWorksheet('ตามพื้นที่');

    titleBar(wws, 1, `  ผลการดำเนินงานตามพื้นที่ ปีงบ ${toThaiNumber(data.fiscalYear)}`, 5);

    wws.columns = [
      { header: 'พื้นที่', key: 'a', width: 30 },
      { header: 'งานทั้งหมด', key: 'b', width: 16 },
      { header: 'เสร็จสิ้น', key: 'c', width: 16 },
      { header: 'อัตราความสำเร็จ', key: 'd', width: 16 },
      { header: 'คงเหลือ', key: 'e', width: 14 },
    ];

    const wHeader = wws.getRow(2);
    wHeader.height = 28;
    ['พื้นที่', 'งานทั้งหมด', 'เสร็จสิ้น', 'อัตราความสำเร็จ', 'คงเหลือ'].forEach((h, i) => {
      hCell(wHeader.getCell(i + 1), h, { size: 12 });
    });

    data.tasksByWorkspace.forEach((ws, i) => {
      const row = wws.getRow(i + 3);
      row.height = 24;
      const fill = i % 2 === 0 ? C.altRow : C.white;
      const rate = ws.count > 0 ? Math.round((ws.completed / ws.count) * 100) : 0;
      const rateColor = rate >= 80 ? C.success : rate >= 50 ? C.warning : C.info;

      dCell(row.getCell(1), ws.name, { bold: true });
      dCell(row.getCell(2), ws.count, { align: 'center' });
      dCell(row.getCell(3), ws.completed, { align: 'center', color: C.success });
      dCell(row.getCell(4), `${rate}%`, { align: 'center', bold: true, color: rateColor, size: 12 });
      dCell(row.getCell(5), ws.count - ws.completed, { align: 'center' });
      [1, 2, 3, 4, 5].forEach(c => row.getCell(c).fill = bgFill(fill));
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function generateMonthlyExcel(data: {
  monthName: string;
  fiscalYear: number;
  tasks: any[];
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();

  const ws = wb.addWorksheet(data.monthName);

  titleBar(ws, 1, `  รายงานรายเดือน ${data.monthName} ปีงบ ${toThaiNumber(data.fiscalYear)}`, 5);

  ws.columns = [
    { header: 'ลำดับ', key: 'a', width: 8 },
    { header: 'ชื่องาน', key: 'b', width: 44 },
    { header: 'พื้นที่', key: 'c', width: 22 },
    { header: 'สถานะ', key: 'd', width: 18 },
    { header: 'ความสำคัญ', key: 'e', width: 14 },
  ];

  const hRow = ws.getRow(2);
  hRow.height = 28;
  ['ลำดับ', 'ชื่องาน', 'พื้นที่', 'สถานะ', 'ความสำคัญ'].forEach((h, i) => {
    hCell(hRow.getCell(i + 1), h, { size: 12 });
  });

  data.tasks.forEach((task, i) => {
    const row = ws.getRow(i + 3);
    row.height = 24;
    const fill = i % 2 === 0 ? C.altRow : C.white;

    dCell(row.getCell(1), i + 1, { align: 'center', bold: true });
    dCell(row.getCell(2), task.title);
    dCell(row.getCell(3), task.workspaceName || '-');
    dCell(row.getCell(4), task.statusName || '-');
    dCell(row.getCell(5), task.priority || '-');

    [1, 2, 3, 4, 5].forEach(c => row.getCell(c).fill = bgFill(fill));
  });

  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 2 }];

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
