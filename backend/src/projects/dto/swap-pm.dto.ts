import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SwapPmDto {
  @IsNotEmpty({ message: 'Vui lòng chọn PM mới' })
  @IsString()
  newPmId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Lý do không được vượt quá 500 ký tự' })
  reason?: string;
}
