import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewEarlyLeaveDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionNote?: string;
}
