import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewOvertimeDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionNote?: string;
}
