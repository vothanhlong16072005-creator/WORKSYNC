import { IsEnum, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { LeaveType } from '@prisma/client';

export class CreateLeaveDto {
  @IsNotEmpty()
  @IsString()
  startDate: string; // YYYY-MM-DD

  @IsNotEmpty()
  @IsString()
  endDate: string; // YYYY-MM-DD

  @IsNotEmpty()
  @IsEnum(LeaveType)
  leaveType: LeaveType;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.5)
  dayCount: number;

  @IsNotEmpty()
  @IsString()
  reason: string;
}
