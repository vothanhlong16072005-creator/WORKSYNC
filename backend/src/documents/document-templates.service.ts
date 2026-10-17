import { Injectable, OnModuleInit, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { DocumentScope, Role } from '@prisma/client';
import { CurrentActor } from './documents-access.service.js';

export interface CreateTemplateInput {
  key: string;
  name: string;
  description?: string;
  content: unknown;
  scope: DocumentScope;
}

@Injectable()
export class DocumentTemplatesService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedSystemTemplates();
  }

  /**
   * Seed 3 core system templates if they don't exist
   */
  async seedSystemTemplates() {
    const adminUser = await this.prisma.user.findFirst({
      where: { role: Role.ADMIN },
      select: { id: true },
    });
    if (!adminUser) return;

    const systemTemplates = [
      {
        key: 'meeting_minutes',
        name: 'Biên bản cuộc họp',
        description: 'Biên bản ghi lại nội dung thảo luận, quyết định và phân công nhiệm vụ sau cuộc họp.',
        scope: DocumentScope.COMPANY,
        content: {
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 1 },
              content: [{ type: 'text', text: 'Biên bản cuộc họp: [Tên cuộc họp]' }],
            },
            {
              type: 'paragraph',
              content: [
                { type: 'text', marks: [{ type: 'bold' }], text: 'Thời gian: ' },
                { type: 'text', text: '[Ngày, giờ bắt đầu - kết thúc]' },
              ],
            },
            {
              type: 'paragraph',
              content: [
                { type: 'text', marks: [{ type: 'bold' }], text: 'Địa điểm / Phòng họp: ' },
                { type: 'text', text: '[Trực tiếp / Trực tuyến Google Meet]' },
              ],
            },
            {
              type: 'paragraph',
              content: [
                { type: 'text', marks: [{ type: 'bold' }], text: 'Người chủ trì: ' },
                { type: 'text', text: '[Họ tên chủ trì]' },
              ],
            },
            {
              type: 'paragraph',
              content: [
                { type: 'text', marks: [{ type: 'bold' }], text: 'Thành phần tham dự: ' },
                { type: 'text', text: '[Danh sách người tham gia]' },
              ],
            },
            {
              type: 'heading',
              attrs: { level: 2 },
              content: [{ type: 'text', text: '1. Mục tiêu & Chương trình họp (Agenda)' }],
            },
            {
              type: 'bulletList',
              content: [
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Đánh giá tiến độ giai đoạn vừa qua' }] }] },
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Thảo luận các vướng mắc và giải pháp' }] }] },
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Thống nhất kế hoạch công việc kế tiếp' }] }] },
              ],
            },
            {
              type: 'heading',
              attrs: { level: 2 },
              content: [{ type: 'text', text: '2. Tóm tắt nội dung thảo luận' }],
            },
            {
              type: 'paragraph',
              content: [{ type: 'text', text: '[Ghi nhận chi tiết các ý kiến đóng góp, phản hồi chính của các thành viên...]' }],
            },
            {
              type: 'heading',
              attrs: { level: 2 },
              content: [{ type: 'text', text: '3. Các quyết định đã thống nhất' }],
            },
            {
              type: 'bulletList',
              content: [
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Quyết định 1: [Mô tả chi tiết]' }] }] },
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Quyết định 2: [Mô tả chi tiết]' }] }] },
              ],
            },
            {
              type: 'heading',
              attrs: { level: 2 },
              content: [{ type: 'text', text: '4. Phân công hành động (Action Items)' }],
            },
            {
              type: 'bulletList',
              content: [
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hành động 1 - Người phụ trách: [Tên] - Hạn chót: [Ngày]' }] }] },
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hành động 2 - Người phụ trách: [Tên] - Hạn chót: [Ngày]' }] }] },
              ],
            },
          ],
        },
      },
      {
        key: 'project_proposal',
        name: 'Đề xuất dự án (Project Proposal)',
        description: 'Mẫu đề xuất ý tưởng dự án mới bao gồm bối cảnh, mục tiêu, phạm vi và kế hoạch triển khai.',
        scope: DocumentScope.COMPANY,
        content: {
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 1 },
              content: [{ type: 'text', text: 'Đề xuất dự án: [Tên Dự Án]' }],
            },
            {
              type: 'paragraph',
              content: [
                { type: 'text', marks: [{ type: 'bold' }], text: 'Đơn vị đề xuất: ' },
                { type: 'text', text: '[Tên phòng ban / nhóm]' },
              ],
            },
            {
              type: 'paragraph',
              content: [
                { type: 'text', marks: [{ type: 'bold' }], text: 'Project Manager (dự kiến): ' },
                { type: 'text', text: '[Họ và tên PM]' },
              ],
            },
            {
              type: 'heading',
              attrs: { level: 2 },
              content: [{ type: 'text', text: '1. Bối cảnh & Vấn đề giải quyết' }],
            },
            {
              type: 'paragraph',
              content: [{ type: 'text', text: '[Mô tả thực trạng, nỗi đau của khách hàng hoặc tổ chức cần giải quyết...]' }],
            },
            {
              type: 'heading',
              attrs: { level: 2 },
              content: [{ type: 'text', text: '2. Mục tiêu dự án (Objectives & Key Results)' }],
            },
            {
              type: 'bulletList',
              content: [
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Mục tiêu 1: Tối ưu hiệu quả vận hành...' }] }] },
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Mục tiêu 2: Tăng trưởng người dùng...' }] }] },
              ],
            },
            {
              type: 'heading',
              attrs: { level: 2 },
              content: [{ type: 'text', text: '3. Phạm vi triển khai (Scope of Work)' }],
            },
            {
              type: 'paragraph',
              content: [{ type: 'text', text: '[Liệt kê các tính năng cốt lõi và các phần nằm ngoài phạm vi (Out-of-scope)...]' }],
            },
            {
              type: 'heading',
              attrs: { level: 2 },
              content: [{ type: 'text', text: '4. Các mốc thời gian chính (Milestones)' }],
            },
            {
              type: 'bulletList',
              content: [
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Giai đoạn 1 (Khởi động & Phân tích): [Ngày bắt đầu - kết thúc]' }] }] },
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Giai đoạn 2 (Thiết kế & Lập trình): [Ngày bắt đầu - kết thúc]' }] }] },
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Giai đoạn 3 (Thử nghiệm & Ra mắt): [Ngày bắt đầu - kết thúc]' }] }] },
              ],
            },
          ],
        },
      },
      {
        key: 'weekly_report',
        name: 'Báo cáo công việc tuần',
        description: 'Mẫu tổng kết tiến độ công việc hàng tuần, khó khăn tồn đọng và dự kiến kế hoạch tuần tiếp theo.',
        scope: DocumentScope.COMPANY,
        content: {
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 1 },
              content: [{ type: 'text', text: 'Báo cáo công việc tuần: [Tuần XX - Tháng YY/2026]' }],
            },
            {
              type: 'paragraph',
              content: [
                { type: 'text', marks: [{ type: 'bold' }], text: 'Người báo cáo: ' },
                { type: 'text', text: '[Họ và tên / Nhóm]' },
              ],
            },
            {
              type: 'heading',
              attrs: { level: 2 },
              content: [{ type: 'text', text: '1. Điểm nổi bật & Kết quả đạt được trong tuần' }],
            },
            {
              type: 'bulletList',
              content: [
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hoàn thành các task theo cam kết sprint...' }] }] },
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Triển khai thành công module...' }] }] },
              ],
            },
            {
              type: 'heading',
              attrs: { level: 2 },
              content: [{ type: 'text', text: '2. Khó khăn, vướng mắc & Đề xuất hỗ trợ (Blockers)' }],
            },
            {
              type: 'paragraph',
              content: [{ type: 'text', text: '[Ghi nhận các cản trở kỹ thuật, nhân sự hoặc phụ thuộc liên phòng ban...]' }],
            },
            {
              type: 'heading',
              attrs: { level: 2 },
              content: [{ type: 'text', text: '3. Kế hoạch công tác trọng tâm tuần tới' }],
            },
            {
              type: 'bulletList',
              content: [
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Mục tiêu 1: ...' }] }] },
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Mục tiêu 2: ...' }] }] },
              ],
            },
          ],
        },
      },
    ];

    for (const tpl of systemTemplates) {
      await this.prisma.documentTemplate.upsert({
        where: { key: tpl.key },
        create: {
          key: tpl.key,
          name: tpl.name,
          description: tpl.description,
          content: tpl.content,
          scope: tpl.scope,
          isSystem: true,
          createdById: adminUser.id,
        },
        update: {
          name: tpl.name,
          description: tpl.description,
          content: tpl.content,
          isSystem: true,
        },
      });
    }
  }

  /**
   * Get all templates
   */
  async getAllTemplates() {
    return this.prisma.documentTemplate.findMany({
      orderBy: [{ isSystem: 'desc' }, { createdAt: 'desc' }],
      include: {
        createdBy: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });
  }

  /**
   * Get template by key
   */
  async getTemplateByKey(key: string) {
    const template = await this.prisma.documentTemplate.findUnique({
      where: { key },
    });
    if (!template) {
      throw new NotFoundException(`Template với mã '${key}' không tồn tại`);
    }
    return template;
  }

  /**
   * Create custom template (Admin or Dept Head)
   */
  async createTemplate(dto: CreateTemplateInput, actor: CurrentActor) {
    if (actor.role !== Role.ADMIN && actor.role !== Role.DEPARTMENT_HEAD) {
      throw new ForbiddenException('Chỉ Quản trị viên hoặc Trưởng phòng mới có thể tạo template mới');
    }

    return this.prisma.documentTemplate.create({
      data: {
        key: dto.key,
        name: dto.name,
        description: dto.description,
        content: dto.content as object,
        scope: dto.scope,
        isSystem: false,
        createdById: actor.id,
      },
      include: {
        createdBy: { select: { id: true, name: true, avatar: true } },
      },
    });
  }
}
