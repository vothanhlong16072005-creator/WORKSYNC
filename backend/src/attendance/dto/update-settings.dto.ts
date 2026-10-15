import { IsString, IsOptional, IsNumber, IsArray, Min, Max } from 'class-validator';

export class UpdateAttendanceSettingsDto {
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  workStartTime?: string;

  @IsOptional()
  @IsString()
  workEndTime?: string;

  @IsOptional()
  @IsString()
  checkinStartTime?: string;

  @IsOptional()
  @IsString()
  checkinEndTime?: string;

  @IsOptional()
  @IsNumber()
  officeLatitude?: number;

  @IsOptional()
  @IsNumber()
  officeLongitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(5000)
  gpsRadiusMeters?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedIpRanges?: string[];

  @IsOptional()
  @IsString()
  wfhAutoApproveTime?: string;
}
