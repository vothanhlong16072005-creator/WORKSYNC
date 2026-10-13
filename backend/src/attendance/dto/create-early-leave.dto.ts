import { IsDateString, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateEarlyLeaveDto {
  @IsDateString()
  date!: string;

  @IsDateString()
  expectedLeaveTime!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
