import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
  JoinColumn,
} from 'typeorm';
import { Meeting } from './meeting.entity';
import { QaPair } from './qa-pair.entity';
import { Export } from './export.entity';

export enum ContractType {
  NDA = 'nda',
  MOU = 'mou',
  SOW = 'sow',
  SLA = 'sla',
  PROJECT_AGREEMENT = 'project_agreement',
}

export enum DraftStatus {
  DRAFTING = 'drafting',
  COMPLETED = 'completed',
  REVIEWING = 'reviewing',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('drafts')
@Index(['meeting_id'])
@Index(['organization_id'])
@Index(['contract_type'])
export class Draft {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column({ name: 'meeting_id' })
  meetingId: string;

  @Column({
    type: 'enum',
    enum: ContractType,
    default: ContractType.NDA,
  })
  contractType: ContractType;

  @Column({
    type: 'enum',
    enum: DraftStatus,
    default: DraftStatus.DRAFTING,
  })
  status: DraftStatus;

  @Column({ name: 's3_docx_key', nullable: true })
  s3DocxKey: string;

  @Column({ name: 's3_pdf_key', nullable: true })
  s3PdfKey: string;

  @Column({ name: 'json_bundle', type: 'jsonb', nullable: true })
  jsonBundle: {
    decisions: any[];
    clauses: any[];
    placeholders: any[];
    deviations: any[];
    metadata: any;
  };

  @Column({ type: 'jsonb', nullable: true })
  placeholders: {
    name: string;
    value: string | null;
    required: boolean;
    type: string;
    description: string;
  }[];

  @Column({ type: 'jsonb', nullable: true })
  deviations: {
    clauseId: string;
    type: 'added' | 'removed' | 'modified';
    description: string;
    risk: 'low' | 'medium' | 'high';
  }[];

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    version: string;
    generatedAt: string;
    jurisdiction: string;
    industry?: string;
    totalClauses: number;
    placeholderCount: number;
    deviationCount: number;
  };

  @Column({ type: 'int', default: 1 })
  version: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Meeting, (meeting) => meeting.drafts)
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting;

  @OneToMany(() => QaPair, (qaPair) => qaPair.draft)
  qaPairs: QaPair[];

  @OneToMany(() => Export, (export_) => export_.draft)
  exports: Export[];
}

