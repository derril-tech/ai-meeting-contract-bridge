import { ApiProperty } from '@nestjs/swagger';
import { MeetingStatus } from '../../database/entities/meeting.entity';

export class MeetingResponseDto {
  @ApiProperty({ description: 'Meeting ID' })
  id: string;

  @ApiProperty({ description: 'Organization ID' })
  organizationId: string;

  @ApiProperty({ description: 'Project ID' })
  projectId: string;

  @ApiProperty({ description: 'Meeting title' })
  title: string;

  @ApiProperty({ description: 'Meeting date' })
  date: Date;

  @ApiProperty({ description: 'Transcript S3 key', required: false })
  transcriptS3Key?: string;

  @ApiProperty({ description: 'Meeting status' })
  status: MeetingStatus;

  @ApiProperty({ description: 'Meeting metadata', required: false })
  metadata?: any;

  @ApiProperty({ description: 'Processing result', required: false })
  processingResult?: any;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  updatedAt: Date;
}

