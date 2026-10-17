import { IsArray, IsDateString, IsEnum, IsHexColor, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ProjectWorkflowType } from '@prisma/client';

export class CreateProjectDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(ProjectWorkflowType)
  workflowType?: ProjectWorkflowType;

  @IsOptional()
  @IsString()
  pmId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  initialMemberIds?: string[];
}
