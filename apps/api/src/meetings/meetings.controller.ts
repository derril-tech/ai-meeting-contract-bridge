import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { MeetingsService } from './meetings.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { MeetingResponseDto } from './dto/meeting-response.dto';

@ApiTags('meetings')
@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload meeting transcript or audio file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        title: {
          type: 'string',
        },
        date: {
          type: 'string',
          format: 'date-time',
        },
        projectId: {
          type: 'string',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadMeeting(
    @UploadedFile() file: Express.Multer.File,
    @Body() createMeetingDto: CreateMeetingDto,
  ): Promise<MeetingResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type
    const allowedTypes = [
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/pdf',
      'audio/wav',
      'audio/mp3',
      'audio/m4a',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type');
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      throw new BadRequestException('File size must be less than 50MB');
    }

    return this.meetingsService.uploadMeeting(file, createMeetingDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get meeting by ID' })
  async getMeeting(@Param('id') id: string): Promise<MeetingResponseDto> {
    const meeting = await this.meetingsService.getMeeting(id);
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }
    return meeting;
  }

  @Get(':id/decisions')
  @ApiOperation({ summary: 'Get decisions for a meeting' })
  async getMeetingDecisions(@Param('id') id: string) {
    const decisions = await this.meetingsService.getMeetingDecisions(id);
    if (!decisions) {
      throw new NotFoundException('Meeting not found');
    }
    return decisions;
  }

  @Post(':id/process')
  @ApiOperation({ summary: 'Manually trigger meeting processing' })
  async processMeeting(@Param('id') id: string) {
    const meeting = await this.meetingsService.getMeeting(id);
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    return this.meetingsService.processMeeting(id);
  }
}

