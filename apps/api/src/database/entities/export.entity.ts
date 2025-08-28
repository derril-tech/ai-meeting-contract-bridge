import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { Draft } from './draft.entity';

export enum ExportFormat {
  DOCX = 'docx',
  PDF = 'pdf',
  MARKDOWN = 'markdown',
  JSON = 'json',
}

export enum ExportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('exports')
@Index(['draft_id'])
@Index(['organization_id'])
@Index(['format'])
export class Export {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column({ name: 'draft_id' })
  draftId: string;

  @Column({
    type: 'enum',
    enum: ExportFormat,
    default: ExportFormat.DOCX,
  })
  format: ExportFormat;

  @Column({
    type: 'enum',
    enum: ExportStatus,
    default: ExportStatus.PENDING,
  })
  status: ExportStatus;

  @Column({ name: 's3_key', nullable: true })
  s3Key: string;

  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  fileSize: number;

  @Column({ name: 'download_url', nullable: true })
  downloadUrl: string;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    version: string;
    exportedAt: string;
    watermark: boolean;
    encryption?: {
      algorithm: string;
      keyId: string;
    };
  };

  @Column({ type: 'text', nullable: true })
  error: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Draft, (draft) => draft.exports)
  @JoinColumn({ name: 'draft_id' })
  draft: Draft;
}

