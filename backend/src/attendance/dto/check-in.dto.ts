import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CheckInDto {
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
