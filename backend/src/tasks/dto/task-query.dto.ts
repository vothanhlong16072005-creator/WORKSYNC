import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum TaskScope {
  MINE = 'mine',
  PROJECT = 'project',
}

export class TaskQueryDto {
  @IsOptional()
  @IsEnum(TaskScope)
  scope: TaskScope = TaskScope.MINE;

  @IsOptional()
  @IsString()
  projectId?: string;
}
