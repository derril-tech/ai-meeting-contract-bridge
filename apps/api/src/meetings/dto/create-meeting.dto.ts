import { IsString, IsOptional, IsDateString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMeetingDto {
  @ApiProperty({ description: 'Meeting title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Meeting date', example: '2024-01-01T10:00:00Z' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Project ID', required: false })
  @IsOptional()
  @IsUUID()
  projectId?: string;
}

