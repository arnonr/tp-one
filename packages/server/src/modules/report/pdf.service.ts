import PDFDocument from 'pdfkit';
import path from 'path';
import type { ReportSummary } from './report.service';

const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const THAI_FONT = path.join(__dirname, '../../assets/fonts/Sarabun-Regular.ttf');
const THAI_FONT_BOLD = path.join(__dirname, '../../assets/fonts/Sarabun-Bold.ttf');
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 50;

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  in_progress: '#3b82f6',
  review: '#8b5cf6',
  completed: '#10b981',
};

function toThaiNumber(num: number): string {
  const digits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
  return num.toString().split('').map(d => digits[parseInt(d)] || d).join('');
}

function formatThaiDate(date: Date): string {
  const thaiYear = date.getFullYear() + 543;
  return `${toThaiNumber(date.getDate())} ${THAI_MONTHS[date.getMonth()]} ${toThaiNumber(thaiYear)}`;
}

function roundRect(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, r: number, fill = false) {
  doc.moveTo(x + r, y);
  doc.lineTo(x + w - r, y);
  doc.quadraticCurveTo(x + w, y, x + w, y + r);
  doc.lineTo(x + w, y + h - r);
  doc.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  doc.lineTo(x + r, y + h);
  doc.quadraticCurveTo(x, y + h, x, y + h - r);
  doc.lineTo(x, y + r);
  doc.quadraticCurveTo(x, y, x + r, y);
  if (fill) doc.fill();
  else doc.stroke();
}

export async function generateSummaryPDF(data: ReportSummary): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: MARGIN, size: 'A4' });

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.registerFont('Thai', THAI_FONT);
    doc.registerFont('Thai-Bold', THAI_FONT_BOLD);

    const contentW = PAGE_W - MARGIN * 2;

    // ── HEADER ──────────────────────────────────────────────
    // Top color bar
    doc.rect(0, 0, PAGE_W, 90).fill('#1e3a5f');

    doc.font('Thai-Bold').fontSize(22).fill('#ffffff')
      .text('รายงานสรุปภาพรวม', MARGIN, 22, { align: 'center', width: contentW });
    doc.font('Thai').fontSize(14).fill('#93c5fd')
      .text(`ปีงบประมาณ ${toThaiNumber(data.fiscalYear)}`, 0, 52, { align: 'center', width: PAGE_W });

    // ── STAT CARDS ─────────────────────────────────────────
    const statY = 110;
    const cardH = 72;
    const cardW = (contentW - 24) / 4;
    const cardGap = 8;
    const statCards = [
      { label: 'งานทั้งหมด', value: data.totalTasks, color: '#3b82f6', sub: 'งาน' },
      { label: 'เสร็จสิ้น', value: data.tasksByStatusType.completed || 0, color: '#10b981', sub: 'งาน' },
      { label: 'อัตราความสำเร็จ', value: data.totalTasks > 0 ? Math.round(((data.tasksByStatusType.completed || 0) / data.totalTasks) * 100) : 0, color: '#10b981', sub: '%' },
      { label: 'โครงการ', value: data.projectStats.total, color: '#8b5cf6', sub: 'โครงการ' },
    ];

    for (let i = 0; i < statCards.length; i++) {
      const cx = MARGIN + i * (cardW + cardGap);
      doc.rect(cx, statY, cardW, cardH).fill('#f8fafc');
      doc.rect(cx, statY, cardW, cardH).stroke('#e2e8f0');
      doc.rect(cx, statY, 4, cardH).fill(statCards[i].color);

      doc.font('Thai').fontSize(10).fill('#64748b')
        .text(statCards[i].label, cx + 14, statY + 10, { width: cardW - 16 });
      doc.font('Thai-Bold').fontSize(22).fill(statCards[i].color)
        .text(`${toThaiNumber(statCards[i].value)}${statCards[i].sub === '%' ? '%' : ''}`, cx + 14, statY + 28, { width: cardW - 16 });
    }

    const bodyY = statY + cardH + 24;

    // ── SECTION 1: สถานะงานตามประเภท ─────────────────────────
    doc.font('Thai-Bold').fontSize(13).fill('#1e3a5f')
      .text('สถานะงานตามประเภท', MARGIN, bodyY);
    doc.moveTo(MARGIN, bodyY + 4).lineTo(MARGIN + 160, bodyY + 4).stroke('#1e3a5f');

    const statusY = bodyY + 18;
    const statusItems = [
      { key: 'pending', label: 'รอทำ' },
      { key: 'in_progress', label: 'อยู่ระหว่างทำ' },
      { key: 'review', label: 'อยู่ระหว่างตรวจ' },
      { key: 'completed', label: 'เสร็จสิ้น' },
    ];

    const barTotal = data.totalTasks > 0 ? data.totalTasks : 1;
    const barY = statusY + 20;
    const barH = 24;
    const barFullW = contentW;
    let barX = MARGIN;

    for (const s of statusItems) {
      const count = data.tasksByStatusType[s.key as keyof typeof data.tasksByStatusType] || 0;
      const w = (count / barTotal) * barFullW;

      if (w > 0) {
        doc.rect(barX, barY, w, barH).fill(STATUS_COLORS[s.key]);
        barX += w;
      }
    }

    // Legend
    for (let i = 0; i < statusItems.length; i++) {
      const s = statusItems[i];
      const count = data.tasksByStatusType[s.key as keyof typeof data.tasksByStatusType] || 0;
      const lx = MARGIN + i * 140;
      doc.rect(lx, barY + barH + 10, 10, 10).fill(STATUS_COLORS[s.key]);
      doc.font('Thai').fontSize(10).fill('#334155')
        .text(`${s.label}: ${toThaiNumber(count)} งาน`, lx + 14, barY + barH + 9, { width: 130 });
    }

    const section2Y = barY + barH + 34;

    // ── SECTION 2: สถานะโครงการ ─────────────────────────────
    doc.font('Thai-Bold').fontSize(13).fill('#1e3a5f')
      .text('สถานะโครงการ', MARGIN, section2Y);
    doc.moveTo(MARGIN, section2Y + 4).lineTo(MARGIN + 130, section2Y + 4).stroke('#1e3a5f');

    const projY = section2Y + 18;
    const projCardW = (contentW - 16) / 3;
    const projCards = [
      { label: 'โครงการทั้งหมด', value: data.projectStats.total, color: '#8b5cf6' },
      { label: 'กำลังดำเนินการ', value: data.projectStats.inProgress, color: '#3b82f6' },
      { label: 'เสร็จสิ้น', value: data.projectStats.completed, color: '#10b981' },
    ];

    for (let i = 0; i < projCards.length; i++) {
      const px = MARGIN + i * (projCardW + 8);
      doc.rect(px, projY, projCardW, 52).fill('#f8fafc');
      doc.rect(px, projY, projCardW, 52).stroke('#e2e8f0');
      doc.rect(px, projY, 3, 52).fill(projCards[i].color);
      doc.font('Thai').fontSize(10).fill('#64748b').text(projCards[i].label, px + 12, projY + 8);
      doc.font('Thai-Bold').fontSize(18).fill(projCards[i].color)
        .text(toThaiNumber(projCards[i].value), px + 12, projY + 24);
    }

    const section3Y = projY + 68;

    // ── SECTION 3: ผลการดำเนินงานตามพื้นที่ ──────────────────
    if (data.tasksByWorkspace.length > 0) {
      doc.font('Thai-Bold').fontSize(13).fill('#1e3a5f')
        .text('ผลการดำเนินงานตามพื้นที่', MARGIN, section3Y);
      doc.moveTo(MARGIN, section3Y + 4).lineTo(MARGIN + 190, section3Y + 4).stroke('#1e3a5f');

      const wsY = section3Y + 18;
      const wsRowH = 26;
      const wsContentX = MARGIN + 120;
      const wsBarW = contentW - 130;

      for (let i = 0; i < data.tasksByWorkspace.length; i++) {
        const ws = data.tasksByWorkspace[i];
        const rowY = wsY + i * (wsRowH + 6);
        const pct = ws.count > 0 ? (ws.completed / ws.count) * 100 : 0;

        doc.font('Thai').fontSize(10).fill('#334155')
          .text(ws.name, MARGIN, rowY + 5, { width: 110 });

        doc.rect(wsContentX, rowY + 2, wsBarW, 16).fill('#e2e8f0');
        doc.rect(wsContentX, rowY + 2, (pct / 100) * wsBarW, 16).fill('#3b82f6');

        doc.font('Thai').fontSize(10).fill('#64748b')
          .text(`${toThaiNumber(ws.completed)}/${toThaiNumber(ws.count)}`, wsContentX + wsBarW + 8, rowY + 5, { width: 60 });
      }
    }

    const section4Y = data.tasksByWorkspace.length > 0
      ? section3Y + 18 + data.tasksByWorkspace.length * 32 + 20
      : section3Y;

    // ── SECTION 4: สถานะงานรายเดือน ───────────────────────────
    doc.font('Thai-Bold').fontSize(13).fill('#1e3a5f')
      .text('สถานะงานรายเดือน', MARGIN, section4Y);
    doc.moveTo(MARGIN, section4Y + 4).lineTo(MARGIN + 150, section4Y + 4).stroke('#1e3a5f');

    const monthY = section4Y + 18;
    const colW = (contentW - 20) / 4;
    const cols = [
      { label: 'เดือน', x: MARGIN },
      { label: 'สร้างใหม่', x: MARGIN + colW },
      { label: 'เสร็จสิ้น', x: MARGIN + colW * 2 },
      { label: 'คงเหลือ', x: MARGIN + colW * 3 },
    ];

    doc.rect(MARGIN, monthY, contentW, 20).fill('#1e3a5f');
    doc.font('Thai-Bold').fontSize(10).fill('#ffffff');
    for (const c of cols) {
      doc.text(c.label, c.x + 4, monthY + 5);
    }

    let rowY = monthY + 20;
    const rowH = 22;
    for (let i = 0; i < data.monthlyData.length; i++) {
      const m = data.monthlyData[i];
      if (m.created === 0 && m.completed === 0) continue;

      const bg = i % 2 === 0 ? '#f8fafc' : '#ffffff';
      doc.rect(MARGIN, rowY, contentW, rowH).fill(bg);

      doc.font('Thai').fontSize(10).fill('#334155').text(m.month, MARGIN + 4, rowY + 5);
      doc.text(toThaiNumber(m.created), MARGIN + colW + 4, rowY + 5);
      doc.text(toThaiNumber(m.completed), MARGIN + colW * 2 + 4, rowY + 5);
      doc.text(toThaiNumber(m.created - m.completed), MARGIN + colW * 3 + 4, rowY + 5);
      rowY += rowH;
    }

    // ── FOOTER ─────────────────────────────────────────────
    doc.font('Thai').fontSize(8).fill('#94a3b8')
      .text(`พิมพ์เมื่อ: ${formatThaiDate(new Date())} | ระบบจัดการงานอุทยานเทคโนโลยี`, 0, PAGE_H - 30, { align: 'center', width: PAGE_W });

    doc.end();
  });
}

export async function generateMonthlyPDF(
  data: { month: number; year: number; tasks: any[]; summary: ReportSummary },
  monthName: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: MARGIN, size: 'A4' });

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.registerFont('Thai', THAI_FONT);
    doc.registerFont('Thai-Bold', THAI_FONT_BOLD);

    const contentW = PAGE_W - MARGIN * 2;

    // ── HEADER ──────────────────────────────────────────────
    doc.rect(0, 0, PAGE_W, 90).fill('#1e3a5f');
    doc.font('Thai-Bold').fontSize(20).fill('#ffffff')
      .text('รายงานรายเดือน', MARGIN, 22, { align: 'center', width: contentW });
    doc.font('Thai').fontSize(13).fill('#93c5fd')
      .text(`${monthName}`, 0, 52, { align: 'center', width: PAGE_W });

    // Summary card
    doc.rect(MARGIN, 105, contentW, 48).fill('#f0f9ff');
    doc.rect(MARGIN, 105, contentW, 48).stroke('#bfdbfe');
    doc.font('Thai').fontSize(11).fill('#1e40af')
      .text(`งานที่เสร็จสิ้นในเดือน: ${toThaiNumber(data.tasks.length)} งาน`, MARGIN + 16, 120);

    // Table header
    const tableY = 165;
    const colX = [40, 90, 330, 430, 510];
    const colW = [50, 230, 90, 70, 60];

    doc.rect(MARGIN, tableY, contentW, 24).fill('#1e3a5f');
    const headers = ['ลำดับ', 'ชื่องาน', 'พื้นที่', 'สถานะ', 'ลำดับ'];
    doc.font('Thai-Bold').fontSize(10).fill('#ffffff');
    let cx = MARGIN + 4;
    doc.text('ลำดับ', cx, tableY + 7); cx += colW[0];
    doc.text('ชื่องาน', cx, tableY + 7); cx += colW[1];
    doc.text('พื้นที่', cx, tableY + 7); cx += colW[2];
    doc.text('สถานะ', cx, tableY + 7);

    // Table rows
    let rowY = tableY + 24;
    const rowH = 24;
    data.tasks.forEach((task, i) => {
      if (rowY > PAGE_H - 60) {
        doc.addPage();
        rowY = MARGIN;
      }

      const bg = i % 2 === 0 ? '#f8fafc' : '#ffffff';
      doc.rect(MARGIN, rowY, contentW, rowH).fill(bg);

      doc.font('Thai').fontSize(9).fill('#334155');
      cx = MARGIN + 4;
      doc.text(toThaiNumber(i + 1), cx, rowY + 7); cx += colW[0];
      doc.text(task.title.substring(0, 35), cx, rowY + 7, { width: colW[1] - 8 }); cx += colW[1];
      doc.text((task.workspaceName || '-').substring(0, 12), cx, rowY + 7, { width: colW[2] - 8 }); cx += colW[2];
      doc.text((task.statusName || '-').substring(0, 8), cx, rowY + 7);

      rowY += rowH;
    });

    // Footer
    doc.font('Thai').fontSize(8).fill('#94a3b8')
      .text(`พิมพ์เมื่อ: ${formatThaiDate(new Date())} | ระบบจัดการงานอุทยานเทคโนโลยี`, 0, PAGE_H - 30, { align: 'center', width: PAGE_W });

    doc.end();
  });
}
