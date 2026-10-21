import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ChatService } from './chat.service.js';

/**
 * Controller phục vụ tải và xem tệp đính kèm trong chat
 * Không áp dụng JwtAuthGuard ở mức class để trình duyệt có thể render <img> và mở link tải trực tiếp
 */
@Controller('chat/files')
export class ChatFilesController {
  constructor(private readonly chatService: ChatService) {}

  @Get(':filename')
  async downloadFile(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const filePath = this.chatService.getFilePath(filename);
    res.sendFile(filePath);
  }
}
