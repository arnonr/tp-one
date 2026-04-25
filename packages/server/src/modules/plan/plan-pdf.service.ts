import PDFDocument from 'pdfkit';
import path from 'path';
import type { PlanExportData } from './types';

const THAI_FONT = path.join(__dirname, '../../assets/fonts/Sarabun-Regular.ttf');
const THAI_FONT_BOLD = path.join(__dirname, '../../assets/fonts/Sarabun-Bold.ttf');
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 50;

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

function toThaiNumber(num: number): string {
  const digits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
  return num.toString().split('').map(d => digits[parseInt(d)] || d).join('');
}

function formatThaiDate(date: Date): string {
  const thaiYear = date.getFullYear() + 543;
  return `${toThaiNumber(date.getDate())} ${THAI_MONTHS[date.getMonth()]} ${toThaiNumber(thaiYear)}`;
}

function progressColor(pct: number): string {
  if (pct >= 80) return '#10b981';
  if (pct >= 50) return '#3b82f6';
  if (pct >= 25) return '#f59e0b';
  return '#ef4444';
}

export async function generatePlanPDF(data: PlanExportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: MARGIN, size: 'A4' });

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.registerFont('Thai', THAI_FONT);
    doc.registerFont('Thai-Bold', THAI_FONT_BOLD);

    const contentW = PAGE_W - MARGIN * 2;
    const { plan, progress } = data;

    // ── HEADER ──────────────────────────────────────────────
    doc.rect(0, 0, PAGE_W, 90).fill('#1e3a5f');
    doc.font('Thai-Bold').fontSize(20).fill('#ffffff')
      .text('รายงานแผนปฏิบัติการ', MARGIN, 22, { align: 'center', width: contentW });
    doc.font('Thai').fontSize(13).fill('#93c5fd')
      .text(`${String(plan.name)} — ปีงบประมาณ ${toThaiNumber(plan.year)}`, 0, 52, { align: 'center', width: PAGE_W });

    // ── OVERALL PROGRESS CARD ───────────────────────────────
    const cardY = 108;
    doc.rect(MARGIN, cardY, contentW, 60).fill('#f8fafc');
    doc.rect(MARGIN, cardY, contentW, 60).stroke('#e2e8f0');
    doc.rect(MARGIN, cardY, 4, 60).fill('#1e3a5f');

    const overallPct = Math.round(progress.overallProgress);
    doc.font('Thai').fontSize(11).fill('#64748b')
      .text('ความก้าวหน้าโดยรวม', MARGIN + 16, cardY + 10);
    doc.font('Thai-Bold').fontSize(28).fill(progressColor(overallPct))
      .text(`${toThaiNumber(overallPct)}%`, MARGIN + 16, cardY + 24);

    // progress bar
    const barX = MARGIN + 140;
    const barW = contentW - 160;
    doc.rect(barX, cardY + 28, barW, 16).fill('#e2e8f0');
    doc.rect(barX, cardY + 28, (overallPct / 100) * barW, 16).fill(progressColor(overallPct));

    // ── STRATEGY SECTIONS ───────────────────────────────────
    let y = cardY + 72;

    for (const strat of progress.strategies) {
      // check if we need a new page
      if (y > PAGE_H - 120) {
        doc.addPage();
        y = MARGIN;
      }

      // Strategy header
      const stratPct = Math.round(strat.weightedProgress);
      doc.rect(MARGIN, y, contentW, 30).fill('#f1f5f9');
      doc.font('Thai-Bold').fontSize(12).fill('#1e3a5f')
        .text(`${String(strat.strategyCode)} ${String(strat.strategyName)}`, MARGIN + 10, y + 8);
      doc.font('Thai-Bold').fontSize(12).fill(progressColor(stratPct))
        .text(`${toThaiNumber(stratPct)}%`, PAGE_W - MARGIN - 50, y + 8, { width: 46, align: 'right' });
      y += 34;

      // Table header
      doc.rect(MARGIN, y, contentW, 20).fill('#334155');
      doc.font('Thai-Bold').fontSize(9).fill('#ffffff');
      const cols = [
        { label: 'รหัส', x: MARGIN + 4, w: 65 },
        { label: 'ตัวชี้วัด', x: MARGIN + 72, w: 170 },
        { label: 'เป้าหมาย', x: MARGIN + 246, w: 60 },
        { label: 'ปัจจุบัน', x: MARGIN + 310, w: 60 },
        { label: 'น้ำหนัก', x: MARGIN + 374, w: 40 },
        { label: 'ความก้าวหน้า', x: MARGIN + 418, w: 120 },
      ];
      for (const c of cols) {
        doc.text(c.label, c.x, y + 5);
      }
      y += 22;

      for (const goal of strat.goals) {
        // Goal sub-header
        if (y > PAGE_H - 80) {
          doc.addPage();
          y = MARGIN;
        }

        doc.rect(MARGIN, y, contentW, 18).fill('#e2e8f0');
        doc.font('Thai-Bold').fontSize(8.5).fill('#475569')
          .text(`${String(goal.goalCode)} ${String(goal.goalName)}`, MARGIN + 6, y + 4);
        const goalPct = Math.round(goal.weightedProgress);
        doc.font('Thai').fontSize(8.5).fill(progressColor(goalPct))
          .text(`${toThaiNumber(goalPct)}%`, PAGE_W - MARGIN - 50, y + 4, { width: 46, align: 'right' });
        y += 20;

        // Indicator rows
        for (const ind of goal.indicators) {
          if (y > PAGE_H - 60) {
            doc.addPage();
            y = MARGIN;
          }

          const indPct = ind.latestProgressPct ?? 0;
          doc.rect(MARGIN, y, contentW, 20).fill('#ffffff');
          doc.rect(MARGIN + 2, y + 2, 0.5, 16).fill('#cbd5e1');

          doc.font('Thai').fontSize(8.5).fill('#334155');
          doc.text(String(ind.indicatorCode), MARGIN + 8, y + 5, { width: 58 });
          doc.text(String(ind.indicatorName), MARGIN + 72, y + 5, { width: 168 });
          doc.text(`${toThaiNumber(parseFloat(String(ind.targetValue)))} ${ind.unit || ''}`, MARGIN + 246, y + 5, { width: 58 });
          doc.text(ind.latestValue ? `${toThaiNumber(parseFloat(String(ind.latestValue)))}` : '-', MARGIN + 310, y + 5, { width: 58 });
          doc.text(toThaiNumber(parseFloat(String(ind.weight))), MARGIN + 374, y + 5, { width: 38 });

          // mini progress bar
          const pbX = MARGIN + 420;
          const pbW = 80;
          doc.rect(pbX, y + 6, pbW, 8).fill('#e2e8f0');
          doc.rect(pbX, y + 6, (Math.min(indPct, 100) / 100) * pbW, 8).fill(progressColor(indPct));
          doc.font('Thai').fontSize(8).fill(progressColor(indPct))
            .text(`${toThaiNumber(Math.round(indPct))}%`, pbX + pbW + 4, y + 5);

          y += 22;
        }
      }

      y += 8;
    }

    // ── QUARTERLY SUMMARY TABLE ─────────────────────────────
    if (data.monthlyUpdates.length > 0) {
      if (y > PAGE_H - 150) {
        doc.addPage();
        y = MARGIN;
      }

      doc.font('Thai-Bold').fontSize(13).fill('#1e3a5f')
        .text('สรุปรายไตรมาส', MARGIN, y);
      doc.moveTo(MARGIN, y + 4).lineTo(MARGIN + 130, y + 4).stroke('#1e3a5f');
      y += 18;

      const quarterLabels: Record<number, string> = {
        1: 'ไตรมาสที่ 1 (ต.ค.-ธ.ค.)',
        2: 'ไตรมาสที่ 2 (ม.ค.-มี.ค.)',
        3: 'ไตรมาสที่ 3 (เม.ย.-มิ.ย.)',
        4: 'ไตรมาสที่ 4 (ก.ค.-ก.ย.)',
      };
      const fiscalQuarters: Record<number, number[]> = {
        1: [10, 11, 12],
        2: [1, 2, 3],
        3: [4, 5, 6],
        4: [7, 8, 9],
      };

      // header row
      doc.rect(MARGIN, y, contentW, 20).fill('#334155');
      doc.font('Thai-Bold').fontSize(9).fill('#ffffff');
      doc.text('ไตรมาส', MARGIN + 4, y + 5);
      doc.text('จำนวนตัวชี้วัด', MARGIN + 180, y + 5);
      doc.text('ค่าเฉลี่ยความก้าวหน้า', MARGIN + 320, y + 5);
      y += 22;

      for (const [q, months] of Object.entries(fiscalQuarters)) {
        const qUpdates = data.monthlyUpdates.filter(u => months.includes(u.month));
        if (qUpdates.length === 0) continue;

        const avgProgress = qUpdates.reduce((s, u) => s + u.progressPct, 0) / qUpdates.length;
        const qNum = parseInt(q);

        doc.rect(MARGIN, y, contentW, 22).fill(qNum % 2 === 0 ? '#f8fafc' : '#ffffff');
        doc.font('Thai-Bold').fontSize(9).fill('#334155')
          .text(quarterLabels[qNum], MARGIN + 6, y + 6);
        doc.font('Thai').fontSize(9).fill('#334155')
          .text(toThaiNumber(qUpdates.length), MARGIN + 186, y + 6, { width: 60, align: 'center' });
        doc.font('Thai-Bold').fontSize(9).fill(progressColor(avgProgress))
          .text(`${toThaiNumber(Math.round(avgProgress))}%`, MARGIN + 326, y + 6);
        y += 22;
      }
    }

    // ── FOOTER ─────────────────────────────────────────────
    doc.font('Thai').fontSize(8).fill('#94a3b8')
      .text(`พิมพ์เมื่อ: ${formatThaiDate(new Date())} | ระบบจัดการงานอุทยานเทคโนโลยี`, 0, PAGE_H - 30, { align: 'center', width: PAGE_W });

    doc.end();
  });
}
