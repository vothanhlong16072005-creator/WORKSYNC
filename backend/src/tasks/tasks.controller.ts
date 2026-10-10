import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { TasksService } from './tasks.service.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { TaskQueryDto } from './dto/task-query.dto.js';
import { MoveTaskOnBoardDto } from './dto/move-task-on-board.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { CurrentActor } from '../projects/project-access.service.js';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(@Body() createTaskDto: CreateTaskDto, @CurrentUser() actor: CurrentActor) {
    return this.tasksService.create(createTaskDto, actor.id);
  }

  @Get()
  findAll(@Query() query: TaskQueryDto, @CurrentUser() actor: CurrentActor) {
    return this.tasksService.findAll(query, actor);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Patch(':id/board-position')
  moveOnBoard(
    @Param('id') id: string,
    @CurrentUser() actor: CurrentActor,
    @Body() moveTaskOnBoardDto: MoveTaskOnBoardDto,
  ) {
    return this.tasksService.moveOnBoard(id, actor, moveTaskOnBoardDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    return this.tasksService.update(id, updateTaskDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }
}
