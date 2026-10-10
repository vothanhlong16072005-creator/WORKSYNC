import { IsEnum, IsInt, Min } from 'class-validator';
import { TaskStatus } from '@prisma/client';

export class MoveTaskOnBoardDto {
  @IsEnum(TaskStatus)
  status: TaskStatus;

  @IsInt()
  @Min(0)
  destinationIndex: number;
}
