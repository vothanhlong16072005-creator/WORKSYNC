import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { PrismaService } from '../prisma/prisma.service.js';

export interface ExportAttendanceRow {
  date: string;          // YYYY-MM-DD
  checkInTime: string;   // HH:MM
  checkOutTime: string;  // HH:MM
  workHours: string;     // e.g. "8.00"
  status: string;
  method: string;
  ip: string;
  note: string;
  userName?: string;
  userEmail?: string;
}

export interface ExportFilter {
  userId?: string;
  fromDate?: string;
  toDate?: string;
  /** When true, include userName/email (for PM/HR/Admin) */
  includeUserInfo?: boolean;
}

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Build rows of attendance data for export
   */
  private async buildRows(filter: ExportFilter): Promise<ExportAttendanceRow[]> {
    const where: Record<string, unknown> = {};
    if (filter.userId) where.userId = filter.userId;
    if (filter.fromDate || filter.toDate) {
      const dateFilter: Record<string, Date> = {};
      if (filter.fromDate) dateFilter.gte = new Date(`${filter.fromDate}T00:00:00.000Z`);
      if (filter.toDate) dateFilter.lte = new Date(`${filter.toDate}T23:59:59.999Z`);
      where.date = dateFilter;
    }

    const records = await this.prisma.attendanceRecord.findMany({
      where,
      orderBy: [{ userId: 'asc' }, { date: 'desc' }],
      include: filter.includeUserInfo
        ? { user: { select: { name: true, email: true } } }
        : undefined,
    });

    return records.map((r) => {
      const checkIn = r.checkInTime ? new Date(r.checkInTime) : null;
      const checkOut = r.checkOutTime ? new Date(r.checkOutTime) : null;
      let workHours = '';
      if (checkIn && checkOut) {
        const totalMin = (checkOut.getTime() - checkIn.getTime()) / 60000;
        workHours = (totalMin / 60).toFixed(2);
      }
      const userInfo = filter.includeUserInfo
        ? (r as unknown as { user?: { name?: string; email?: string } }).user
        : undefined;
      return {
        date: r.date.toISOString().split('T')[0] ?? '',
        checkInTime: checkIn ? checkIn.toTimeString().slice(0, 5) : '—',
        checkOutTime: checkOut ? checkOut.toTimeString().slice(0, 5) : '—',
        workHours,
        status: r.status,
        method: r.checkInMethod ?? '—',
        ip: r.checkInIp ?? '—',
        note: r.note ?? '—',
        userName: userInfo?.name,
        userEmail: userInfo?.email,
      };
    });
  }

  /**
   * Generate Excel file as Buffer
   */
  async generateExcel(filter: ExportFilter): Promise<Buffer> {
    const rows = await this.buildRows(filter);
    const worksheet = XLSX.utils.json_to_sheet(
      rows.map((r) => {
        const row: Record<string, string> = {
          Date: r.date,
          'Check In': r.checkInTime,
          'Check Out': r.checkOutTime,
          'Work Hours': r.workHours,
          Status: r.status,
          Method: r.method,
          IP: r.ip,
          Note: r.note,
        };
        if (r.userName) row['Name'] = r.userName;
        if (r.userEmail) row['Email'] = r.userEmail;
        return row;
      }),
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  /**
   * Generate PDF file as Buffer
   */
  async generatePDF(filter: ExportFilter, companyName = 'WorkSync'): Promise<Buffer> {
    const rows = await this.buildRows(filter);
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

    // Header
    doc.setFontSize(16);
    doc.setTextColor(30, 58, 138); // cobalt-900
    doc.text(`${companyName} — Attendance Report`, 40, 40);

    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105); // slate-600
    const dateRange = filter.fromDate && filter.toDate
      ? `From ${filter.fromDate} to ${filter.toDate}`
      : filter.fromDate
        ? `From ${filter.fromDate}`
        : filter.toDate
          ? `To ${filter.toDate}`
          : 'All time';
    doc.text(`Generated: ${new Date().toLocaleString('vi-VN')} • ${dateRange}`, 40, 58);

    // Manual table rendering (no plugin dependency)
    const headers = filter.includeUserInfo
      ? ['Name', 'Email', 'Date', 'In', 'Out', 'Hours', 'Status', 'Method', 'Note']
      : ['Date', 'In', 'Out', 'Hours', 'Status', 'Method', 'Note'];

    const colWidths = filter.includeUserInfo
      ? [70, 110, 65, 35, 35, 40, 75, 45, 130]  // = 605
      : [65, 35, 35, 40, 75, 45, 130];          // = 425

    let y = 85;
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginBottom = 40;
    const rowHeight = 14;

    // Header row
    doc.setFillColor(29, 78, 216);
    doc.rect(40, y - 12, colWidths.reduce((a, b) => a + b, 0), rowHeight, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    let x = 42;
    headers.forEach((h, i) => {
      doc.text(h, x, y - 1);
      x += colWidths[i] ?? 40;
    });
    y += rowHeight;

    // Data rows
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    for (let idx = 0; idx < rows.length; idx++) {
      if (y > pageHeight - marginBottom) {
        doc.addPage();
        y = 40;
      }
      const r = rows[idx]!;
      const cells = filter.includeUserInfo
        ? [r.userName ?? '', r.userEmail ?? '', r.date, r.checkInTime, r.checkOutTime, r.workHours, r.status, r.method, r.note]
        : [r.date, r.checkInTime, r.checkOutTime, r.workHours, r.status, r.method, r.note];

      // Alternate row bg
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(40, y - 12, colWidths.reduce((a, b) => a + b, 0), rowHeight, 'F');
      }

      doc.setTextColor(30, 41, 59);
      x = 42;
      cells.forEach((cell, i) => {
        const text = String(cell).slice(0, 22);
        doc.text(text, x, y - 1);
        x += colWidths[i] ?? 40;
      });
      y += rowHeight;
    }

    // Footer
    const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(
        `${companyName} • Page ${i} of ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 20,
        { align: 'center' },
      );
    }

    return Buffer.from(doc.output('arraybuffer'));
  }
}
