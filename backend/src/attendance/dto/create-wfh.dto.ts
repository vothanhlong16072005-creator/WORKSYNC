import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateWfhDto {
  @IsNotEmpty()
  @IsString()
  date: string; // YYYY-MM-DD

  @IsNotEmpty()
  @IsString()
  reason: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'expectedStart must be HH:MM format' })
  expectedStart: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'expectedEnd must be HH:MM format' })
  expectedEnd: string;
}
