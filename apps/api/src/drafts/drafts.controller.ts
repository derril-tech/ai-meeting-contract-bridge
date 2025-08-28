import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DraftsService } from './drafts.service';
import { GenerateDraftDto } from './dto/generate-draft.dto';
import { UpdateDraftDto } from './dto/update-draft.dto';
import { DraftResponseDto } from './dto/draft-response.dto';

@ApiTags('drafts')
@Controller('drafts')
export class DraftsController {
  constructor(private readonly draftsService: DraftsService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate a contract draft from meeting decisions' })
  async generateDraft(@Body() generateDraftDto: GenerateDraftDto): Promise<DraftResponseDto> {
    return this.draftsService.generateDraft(generateDraftDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get draft by ID' })
  async getDraft(@Param('id') id: string): Promise<DraftResponseDto> {
    const draft = await this.draftsService.getDraft(id);
    if (!draft) {
      throw new NotFoundException('Draft not found');
    }
    return draft;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update draft content and placeholders' })
  async updateDraft(
    @Param('id') id: string,
    @Body() updateDraftDto: UpdateDraftDto,
  ): Promise<DraftResponseDto> {
    const draft = await this.draftsService.updateDraft(id, updateDraftDto);
    if (!draft) {
      throw new NotFoundException('Draft not found');
    }
    return draft;
  }

  @Post(':id/export')
  @ApiOperation({ summary: 'Export draft to various formats' })
  async exportDraft(
    @Param('id') id: string,
    @Body() exportOptions: { format: 'docx' | 'pdf' | 'markdown' | 'json' },
  ) {
    const draft = await this.draftsService.getDraft(id);
    if (!draft) {
      throw new NotFoundException('Draft not found');
    }

    return this.draftsService.exportDraft(id, exportOptions.format);
  }

  @Get(':id/qa')
  @ApiOperation({ summary: 'Get Q&A pairs for a draft' })
  async getDraftQa(@Param('id') id: string) {
    const draft = await this.draftsService.getDraft(id);
    if (!draft) {
      throw new NotFoundException('Draft not found');
    }

    return this.draftsService.getDraftQa(id);
  }

  @Post(':id/qa')
  @ApiOperation({ summary: 'Ask a question about the draft' })
  async askQuestion(
    @Param('id') id: string,
    @Body() questionData: { question: string },
  ) {
    const draft = await this.draftsService.getDraft(id);
    if (!draft) {
      throw new NotFoundException('Draft not found');
    }

    return this.draftsService.askQuestion(id, questionData.question);
  }
}

