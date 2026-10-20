import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ZodSchema } from 'zod';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ChatService, type ExpressUploadedFile } from './chat.service.js';
import {
  SendMessageSchema,
  CreateGroupConversationSchema,
  ToggleReactionSchema,
  ChatMessagesQuerySchema,
  ConversationsQuerySchema,
  type ChatActor,
} from './types/chat.types.js';
import { ChatMessageType } from '@prisma/client';

function parseOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const path = firstIssue?.path?.join('.') ?? 'param';
    const msg = firstIssue?.message ?? 'Tham số không hợp lệ';
    throw new BadRequestException(`[${path}] ${msg}`);
  }
  return result.data;
}

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * 1. Lấy danh sách cuộc trò chuyện của user
   */
  @Get('conversations')
  async getConversations(
    @Query() rawQuery: unknown,
    @CurrentUser() actor: ChatActor,
  ) {
    const query = parseOrThrow(ConversationsQuerySchema, rawQuery);
    return this.chatService.getUserConversations(actor.id, query);
  }

  /**
   * 2. Tạo hoặc lấy cuộc trò chuyện trực tiếp 1-1
   */
  @Post('conversations/direct/:targetUserId')
  async getOrCreateDirectConversation(
    @Param('targetUserId') targetUserId: string,
    @CurrentUser() actor: ChatActor,
  ) {
    return this.chatService.getOrCreateDirectConversation(actor.id, targetUserId);
  }

  /**
   * 3. Tạo hoặc lấy phòng chat nhóm theo Dự án
   */
  @Post('conversations/project/:projectId')
  async getOrCreateProjectConversation(
    @Param('projectId') projectId: string,
    @CurrentUser() actor: ChatActor,
  ) {
    return this.chatService.getOrCreateProjectConversation(projectId, actor.id);
  }

  /**
   * 4. Tạo hoặc lấy phòng chat nhóm theo Phòng ban
   */
  @Post('conversations/department/:departmentId')
  async getOrCreateDepartmentConversation(
    @Param('departmentId') departmentId: string,
    @CurrentUser() actor: ChatActor,
  ) {
    return this.chatService.getOrCreateDepartmentConversation(departmentId, actor.id);
  }

  /**
   * 5. Tạo nhóm chat tùy chỉnh
   */
  @Post('conversations/group')
  async createGroupConversation(
    @Body() rawBody: unknown,
    @CurrentUser() actor: ChatActor,
  ) {
    const dto = parseOrThrow(CreateGroupConversationSchema, rawBody);
    return this.chatService.createGroupConversation(actor.id, dto);
  }

  /**
   * 6. Lấy chi tiết một cuộc trò chuyện
   */
  @Get('conversations/:id')
  async getConversation(
    @Param('id') id: string,
    @CurrentUser() actor: ChatActor,
  ) {
    return this.chatService.getConversationById(id, actor.id);
  }

  /**
   * 7. Lấy danh sách tin nhắn trong cuộc trò chuyện (cursor pagination)
   */
  @Get('conversations/:id/messages')
  async getMessages(
    @Param('id') id: string,
    @Query() rawQuery: unknown,
    @CurrentUser() actor: ChatActor,
  ) {
    const query = parseOrThrow(ChatMessagesQuerySchema, rawQuery);
    return this.chatService.getMessages(id, actor.id, query);
  }

  /**
   * 8. Gửi tin nhắn văn bản
   */
  @Post('conversations/:id/messages')
  async sendMessage(
    @Param('id') id: string,
    @Body() rawBody: unknown,
    @CurrentUser() actor: ChatActor,
  ) {
    const dto = parseOrThrow(SendMessageSchema, rawBody);
    return this.chatService.sendMessage(id, actor, dto);
  }

  /**
   * 9. Gửi tin nhắn đính kèm file
   */
  @Post('conversations/:id/messages/file')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFileAndSend(
    @Param('id') id: string,
    @UploadedFile() file: ExpressUploadedFile,
    @Body('replyToId') replyToId: string | undefined,
    @CurrentUser() actor: ChatActor,
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file cần gửi');
    }

    if (file.size > 25 * 1024 * 1024) {
      throw new BadRequestException('Kích thước file không được vượt quá 25MB');
    }

    const fileData = await this.chatService.uploadFile(actor.id, file);

    return this.chatService.sendMessage(id, actor, {
      content: `[Tệp tin] ${file.originalname}`,
      type: ChatMessageType.FILE,
      replyToId: replyToId || null,
      fileUrl: fileData.fileUrl,
      fileName: fileData.fileName,
      fileSize: fileData.fileSize,
      fileMime: fileData.fileMime,
    });
  }

  /**
   * 10. Tải hoặc xem tệp đính kèm
   */
  @Get('files/:filename')
  async downloadFile(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const filePath = this.chatService.getFilePath(filename);
    res.sendFile(filePath);
  }

  /**
   * 11. Đánh dấu đã đọc
   */
  @Post('conversations/:id/read')
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() actor: ChatActor,
  ) {
    return this.chatService.markAsRead(id, actor.id);
  }

  /**
   * 12. Ghim cuộc trò chuyện
   */
  @Patch('conversations/:id/pin')
  async togglePin(
    @Param('id') id: string,
    @CurrentUser() actor: ChatActor,
  ) {
    return this.chatService.togglePin(id, actor.id);
  }

  /**
   * 13. Tắt/bật thông báo
   */
  @Patch('conversations/:id/mute')
  async toggleMute(
    @Param('id') id: string,
    @CurrentUser() actor: ChatActor,
  ) {
    return this.chatService.toggleMute(id, actor.id);
  }

  /**
   * 14. Thả cảm xúc emoji cho tin nhắn
   */
  @Post('messages/:messageId/reactions')
  async toggleReaction(
    @Param('messageId') messageId: string,
    @Body() rawBody: unknown,
    @CurrentUser() actor: ChatActor,
  ) {
    const dto = parseOrThrow(ToggleReactionSchema, rawBody);
    return this.chatService.toggleReaction(messageId, actor.id, dto.emoji);
  }

  /**
   * 15. Xóa tin nhắn
   */
  @Delete('messages/:messageId')
  async deleteMessage(
    @Param('messageId') messageId: string,
    @CurrentUser() actor: ChatActor,
  ) {
    return this.chatService.deleteMessage(messageId, actor);
  }
}
