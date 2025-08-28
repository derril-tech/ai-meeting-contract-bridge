import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ClausesService } from './clauses.service';
import { CreateClauseDto } from './dto/create-clause.dto';
import { UpdateClauseDto } from './dto/update-clause.dto';
import { ClauseResponseDto } from './dto/clause-response.dto';
import { ClauseCategory, Jurisdiction } from '../database/entities/clause.entity';

@ApiTags('clauses')
@Controller('clauses')
export class ClausesController {
  constructor(private readonly clausesService: ClausesService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search clauses by category, jurisdiction, and keywords' })
  @ApiQuery({ name: 'category', enum: ClauseCategory, required: false })
  @ApiQuery({ name: 'jurisdiction', enum: Jurisdiction, required: false })
  @ApiQuery({ name: 'keyword', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async searchClauses(
    @Query('category') category?: ClauseCategory,
    @Query('jurisdiction') jurisdiction?: Jurisdiction,
    @Query('keyword') keyword?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.clausesService.searchClauses({
      category,
      jurisdiction,
      keyword,
      limit: limit || 20,
      offset: offset || 0,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get clause by ID' })
  async getClause(@Param('id') id: string): Promise<ClauseResponseDto> {
    const clause = await this.clausesService.getClause(id);
    if (!clause) {
      throw new NotFoundException('Clause not found');
    }
    return clause;
  }

  @Post()
  @ApiOperation({ summary: 'Create a new clause' })
  async createClause(@Body() createClauseDto: CreateClauseDto): Promise<ClauseResponseDto> {
    return this.clausesService.createClause(createClauseDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing clause' })
  async updateClause(
    @Param('id') id: string,
    @Body() updateClauseDto: UpdateClauseDto,
  ): Promise<ClauseResponseDto> {
    const clause = await this.clausesService.updateClause(id, updateClauseDto);
    if (!clause) {
      throw new NotFoundException('Clause not found');
    }
    return clause;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a clause' })
  async deleteClause(@Param('id') id: string) {
    const result = await this.clausesService.deleteClause(id);
    if (!result) {
      throw new NotFoundException('Clause not found');
    }
    return { message: 'Clause deleted successfully' };
  }

  @Post('seed')
  @ApiOperation({ summary: 'Seed the clause library with default clauses' })
  async seedClauses() {
    return this.clausesService.seedClauses();
  }
}

