import { IsDateString, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateOvertimeDto {
  @IsDateString()
  date!: string;

  @IsDateString()
  registeredStart!: string;

  @IsDateString()
  registeredEnd!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
