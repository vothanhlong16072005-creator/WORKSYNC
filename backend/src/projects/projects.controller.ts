import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ProjectsService } from './projects.service.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { SwapPmDto } from './dto/swap-pm.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { CurrentActor } from './project-access.service.js';
import { IsOptional, IsString } from 'class-validator';

class AddMemberDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsString()
  projectRole?: string;
}

class ChangeRoleDto {
  @IsString()
  projectRole!: string;
}

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createProjectDto: CreateProjectDto, @CurrentUser() actor: CurrentActor) {
    return this.projectsService.create(createProjectDto, actor);
  }

  @Get()
  findAll(@CurrentUser() actor: CurrentActor) {
    return this.projectsService.findMine(actor);
  }

  @Get('mine')
  findMine(@CurrentUser() actor: CurrentActor) {
    return this.projectsService.findMine(actor);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() actor: CurrentActor) {
    return this.projectsService.findOne(id, actor);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @CurrentUser() actor: CurrentActor,
  ) {
    return this.projectsService.update(id, updateProjectDto, actor);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() actor: CurrentActor) {
    return this.projectsService.remove(id, actor);
  }

  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  addMember(
    @Param('id') id: string,
    @Body() dto: AddMemberDto,
    @CurrentUser() actor: CurrentActor,
  ) {
    return this.projectsService.addMember(id, dto, actor);
  }

  @Delete(':id/members/:userId')
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() actor: CurrentActor,
  ) {
    return this.projectsService.removeMember(id, userId, actor);
  }

  @Patch(':id/members/:userId/role')
  changeMemberRole(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: ChangeRoleDto,
    @CurrentUser() actor: CurrentActor,
  ) {
    return this.projectsService.changeMemberRole(id, userId, dto, actor);
  }

  @Patch(':id/swap-pm')
  swapPm(
    @Param('id') id: string,
    @Body() dto: SwapPmDto,
    @CurrentUser() actor: CurrentActor,
  ) {
    return this.projectsService.swapPm(id, dto, actor);
  }
}
