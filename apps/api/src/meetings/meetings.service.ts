import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

import { Meeting, MeetingStatus } from '../database/entities/meeting.entity';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { MeetingResponseDto } from './dto/meeting-response.dto';

@Injectable()
export class MeetingsService {
  private s3: AWS.S3;

  constructor(
    @InjectRepository(Meeting)
    private meetingsRepository: Repository<Meeting>,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    this.s3 = new AWS.S3({
      endpoint: this.configService.get('S3_ENDPOINT'),
      accessKeyId: this.configService.get('S3_ACCESS_KEY'),
      secretAccessKey: this.configService.get('S3_SECRET_KEY'),
      s3ForcePathStyle: true,
    });
  }

  async uploadMeeting(
    file: Express.Multer.File,
    createMeetingDto: CreateMeetingDto,
  ): Promise<MeetingResponseDto> {
    // Generate S3 key
    const s3Key = `transcripts/${uuidv4()}/${file.originalname}`;

    // Upload to S3
    await this.s3.upload({
      Bucket: this.configService.get('S3_BUCKET'),
      Key: s3Key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }).promise();

    // Create meeting record
    const meeting = this.meetingsRepository.create({
      organizationId: 'default', // TODO: Get from auth context
      projectId: createMeetingDto.projectId || 'default',
      title: createMeetingDto.title,
      date: new Date(createMeetingDto.date),
      transcriptS3Key: s3Key,
      status: MeetingStatus.UPLOADING,
      metadata: {
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      },
    });

    const savedMeeting = await this.meetingsRepository.save(meeting);

    // Trigger processing
    this.eventEmitter.emit('meeting.ingest', {
      meetingId: savedMeeting.id,
      transcriptS3Key: s3Key,
    });

    return this.mapToResponseDto(savedMeeting);
  }

  async getMeeting(id: string): Promise<MeetingResponseDto | null> {
    const meeting = await this.meetingsRepository.findOne({
      where: { id },
    });

    return meeting ? this.mapToResponseDto(meeting) : null;
  }

  async getMeetingDecisions(id: string) {
    const meeting = await this.meetingsRepository.findOne({
      where: { id },
      relations: ['decisions'],
    });

    if (!meeting) {
      return null;
    }

    return {
      meeting: this.mapToResponseDto(meeting),
      decisions: meeting.decisions || [],
    };
  }

  async processMeeting(id: string) {
    const meeting = await this.meetingsRepository.findOne({
      where: { id },
    });

    if (!meeting) {
      throw new Error('Meeting not found');
    }

    // Trigger processing
    this.eventEmitter.emit('meeting.ingest', {
      meetingId: meeting.id,
      transcriptS3Key: meeting.transcriptS3Key,
    });

    return { message: 'Processing triggered' };
  }

  async updateMeetingStatus(id: string, status: MeetingStatus, processingResult?: any) {
    await this.meetingsRepository.update(id, {
      status,
      processingResult,
    });
  }

  private mapToResponseDto(meeting: Meeting): MeetingResponseDto {
    return {
      id: meeting.id,
      organizationId: meeting.organizationId,
      projectId: meeting.projectId,
      title: meeting.title,
      date: meeting.date,
      transcriptS3Key: meeting.transcriptS3Key,
      status: meeting.status,
      metadata: meeting.metadata,
      processingResult: meeting.processingResult,
      createdAt: meeting.createdAt,
      updatedAt: meeting.updatedAt,
    };
  }
}

