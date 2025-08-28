import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { Meeting } from './entities/meeting.entity';
import { Decision } from './entities/decision.entity';
import { Clause } from './entities/clause.entity';
import { Draft } from './entities/draft.entity';
import { QaPair } from './entities/qa-pair.entity';
import { Export } from './entities/export.entity';
import { AuditLog } from './entities/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      Meeting,
      Decision,
      Clause,
      Draft,
      QaPair,
      Export,
      AuditLog,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}

