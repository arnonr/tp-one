import ExcelJS from 'exceljs';
import type { ReportSummary } from './report.service';

const STATUS_COLORS: Record<string, string> = {
  pending: 'FFF59E0B',
  in_progress: 'FF3B82F6',
  review: 'FF8B5CF6',
  completed: 'FF10B981',
};

const HEADER_FILL = { type: 'patternFill' as const, pattern: 'solid' as const, fgColor: { argb: 'FF1E3A5F' } };
const ALT_FILL = { type: 'patternFill' as const, pattern: 'solid' as const, fgColor: { argb: 'FFF8FAFC' } };
const WHITE_FILL = { type: 'patternFill' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFFFFF' } };

function headerCell(cell: ExcelJS.Cell, text: string) {
  cell.value = text;
  cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  cell.fill = HEADER_FILL;
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  cell.border = {
    top: { style: 'thin', color: { argb: 'FF1E3A5F' } },
    bottom: { style: 'thin', color: { argb: 'FF1E3A5F' } },
    left: { style: 'thin', color: { argb: 'FF1E3A5F' } },
    right: { style: 'thin', color: { argb: 'FF1E3A5F' } },
  };
}

function dataCell(cell: ExcelJS.Cell, value: any, bold = false, color = 'FF334155') {
  cell.value = value;
  cell.font = { bold, color: { argb: color }, size: 10 };
  cell.alignment = { vertical: 'middle' };
  cell.border = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  };
}

function titleRow(ws: ExcelJS.Worksheet, text: string, colSpan: number) {
  ws.mergeCells(1, 1, 1, colSpan);
  const cell = ws.getCell(1, 1);
  cell.value = text;
  cell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  cell.fill = { type: 'patternFill', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;
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
  const summaryWs = wb.addWorksheet('สรุปภาพรวม');

  titleRow(summaryWs, `รายงานสรุปภาพรวม ปีงบประมาณ ${toThaiNumber(data.fiscalYear)}`, 3);

  summaryWs.columns = [
    { header: 'รายการ', key: 'label', width: 28 },
    { header: 'จำนวน', key: 'value', width: 14 },
    { header: 'หมายเหตุ', key: 'note', width: 14 },
  ];

  const stats = [
    { label: 'งานทั้งหมด', value: data.totalTasks, note: 'งาน', color: 'FF3B82F6' },
    { label: 'เสร็จสิ้น', value: data.tasksByStatusType.completed, note: 'งาน', color: 'FF10B981' },
    { label: 'อยู่ระหว่างทำ', value: data.tasksByStatusType.in_progress, note: 'งาน', color: 'FF3B82F6' },
    { label: 'อยู่ระหว่างตรวจ', value: data.tasksByStatusType.review, note: 'งาน', color: 'FF8B5CF6' },
    { label: 'รอทำ', value: data.tasksByStatusType.pending, note: 'งาน', color: 'FFF59E0B' },
  ];

  stats.forEach((s, i) => {
    const row = summaryWs.getRow(i + 2);
    row.height = 22;
    dataCell(row.getCell(1), s.label, true);
    dataCell(row.getCell(2), s.value);
    dataCell(row.getCell(3), s.note);
    if (i % 2 === 0) {
      row.getCell(1).fill = ALT_FILL;
      row.getCell(2).fill = ALT_FILL;
      row.getCell(3).fill = ALT_FILL;
    }
  });

  summaryWs.getRow(stats.length + 2).height = 10;

  const projStart = stats.length + 3;
  titleRow(summaryWs, 'สถานะโครงการ', 3);

  const projStats = [
    { label: 'โครงการทั้งหมด', value: data.projectStats.total, color: 'FF8B5CF6' },
    { label: 'กำลังดำเนินการ', value: data.projectStats.inProgress, color: 'FF3B82F6' },
    { label: 'เสร็จสิ้น', value: data.projectStats.completed, color: 'FF10B981' },
  ];

  projStats.forEach((s, i) => {
    const row = summaryWs.getRow(projStart + i);
    row.height = 22;
    dataCell(row.getCell(1), s.label, true);
    dataCell(row.getCell(2), s.value);
    dataCell(row.getCell(3), '-');
    if (i % 2 === 0) {
      row.getCell(1).fill = ALT_FILL;
      row.getCell(2).fill = ALT_FILL;
      row.getCell(3).fill = ALT_FILL;
    }
  });

  // ── Sheet 2: Monthly ───────────────────────────────────────
  const monthlyWs = wb.addWorksheet('รายเดือน');

  titleRow(monthlyWs, `สถานะงานรายเดือน ปีงบ ${toThaiNumber(data.fiscalYear)}`, 4);

  monthlyWs.columns = [
    { header: 'เดือน', key: 'month', width: 14 },
    { header: 'สร้างใหม่', key: 'created', width: 14 },
    { header: 'เสร็จสิ้น', key: 'completed', width: 14 },
    { header: 'คงเหลือ', key: 'remaining', width: 14 },
  ];

  const monthlyWsHeader = monthlyWs.getRow(2);
  monthlyWsHeader.height = 22;
  ['เดือน', 'สร้างใหม่', 'เสร็จสิ้น', 'คงเหลือ'].forEach((h, i) => {
    headerCell(monthlyWsHeader.getCell(i + 1), h);
  });

  data.monthlyData.forEach((m, i) => {
    const row = monthlyWs.getRow(i + 3);
    row.height = 20;
    const fill = i % 2 === 0 ? ALT_FILL : WHITE_FILL;
    [m.month, m.created, m.completed, m.created - m.completed].forEach((val, ci) => {
      const cell = row.getCell(ci + 1);
      dataCell(cell, val, ci === 0);
      cell.fill = fill;
    });
  });

  // ── Sheet 3: Quarterly ────────────────────────────────────
  const quarterlyWs = wb.addWorksheet('รายไตรมาส');

  titleRow(quarterlyWs, `สถานะงานรายไตรมาส ปีงบ ${toThaiNumber(data.fiscalYear)}`, 4);

  quarterlyWs.columns = [
    { header: 'ไตรมาส', key: 'quarter', width: 20 },
    { header: 'สร้างใหม่', key: 'created', width: 14 },
    { header: 'เสร็จสิ้น', key: 'completed', width: 14 },
    { header: 'รอทำ', key: 'pending', width: 14 },
  ];

  const qHeader = quarterlyWs.getRow(2);
  qHeader.height = 22;
  ['ไตรมาส', 'สร้างใหม่', 'เสร็จสิ้น', 'รอทำ'].forEach((h, i) => {
    headerCell(qHeader.getCell(i + 1), h);
  });

  data.quarterlyData.forEach((q, i) => {
    const row = quarterlyWs.getRow(i + 3);
    row.height = 20;
    const fill = i % 2 === 0 ? ALT_FILL : WHITE_FILL;
    [q.label, q.created, q.completed, q.pending].forEach((val, ci) => {
      const cell = row.getCell(ci + 1);
      dataCell(cell, val, ci === 0);
      cell.fill = fill;
    });
  });

  // ── Sheet 4: By Workspace ──────────────────────────────────
  if (data.tasksByWorkspace.length > 0) {
    const wsSheet = wb.addWorksheet('ตามพื้นที่');

    titleRow(wsSheet, `ผลการดำเนินงานตามพื้นที่ ปีงบ ${toThaiNumber(data.fiscalYear)}`, 4);

    wsSheet.columns = [
      { header: 'พื้นที่', key: 'name', width: 28 },
      { header: 'งานทั้งหมด', key: 'count', width: 14 },
      { header: 'เสร็จสิ้น', key: 'completed', width: 14 },
      { header: 'อัตราความสำเร็จ', key: 'rate', width: 16 },
    ];

    const wsHeader = wsSheet.getRow(1);
    ['พื้นที่', 'งานทั้งหมด', 'เสร็จสิ้น', 'อัตราความสำเร็จ'].forEach((h, i) => {
      headerCell(wsHeader.getCell(i + 1), h);
    });

    data.tasksByWorkspace.forEach((ws, i) => {
      const row = wsSheet.getRow(i + 2);
      row.height = 20;
      const fill = i % 2 === 0 ? ALT_FILL : WHITE_FILL;
      const rate = ws.count > 0 ? `${Math.round((ws.completed / ws.count) * 100)}%` : '0%';

      [ws.name, ws.count, ws.completed, rate].forEach((val, ci) => {
        const cell = row.getCell(ci + 1);
        dataCell(cell, val, ci === 0);
        cell.fill = fill;
        if (ci === 3) {
          cell.font = { bold: true, color: { argb: 'FF10B981' }, size: 10 };
        }
      });
    });
  }

  // Freeze panes
  summaryWs.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
  monthlyWs.views = [{ state: 'frozen', xSplit: 0, ySplit: 2 }];
  quarterlyWs.views = [{ state: 'frozen', xSplit: 0, ySplit: 2 }];

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

  titleRow(ws, `รายงานรายเดือน ${data.monthName} ปีงบ ${toThaiNumber(data.fiscalYear)}`, 5);

  ws.columns = [
    { header: 'ลำดับ', key: 'index', width: 8 },
    { header: 'ชื่องาน', key: 'title', width: 40 },
    { header: 'พื้นที่', key: 'workspace', width: 20 },
    { header: 'สถานะ', key: 'status', width: 16 },
    { header: 'ความสำคัญ', key: 'priority', width: 12 },
  ];

  const hRow = ws.getRow(1);
  ['ลำดับ', 'ชื่องาน', 'พื้นที่', 'สถานะ', 'ความสำคัญ'].forEach((h, i) => {
    headerCell(hRow.getCell(i + 1), h);
  });

  data.tasks.forEach((task, i) => {
    const row = ws.getRow(i + 2);
    row.height = 20;
    const fill = i % 2 === 0 ? ALT_FILL : WHITE_FILL;

    [i + 1, task.title, task.workspaceName || '-', task.statusName || '-', task.priority || '-'].forEach((val, ci) => {
      const cell = row.getCell(ci + 1);
      dataCell(cell, val, ci === 0);
      cell.fill = fill;
    });
  });

  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
