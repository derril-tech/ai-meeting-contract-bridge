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
import { Project } from './project.entity';
import { Decision } from './decision.entity';
import { Draft } from './draft.entity';

export enum MeetingStatus {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('meetings')
@Index(['project_id'])
@Index(['organization_id'])
export class Meeting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @Column()
  title: string;

  @Column({ type: 'timestamp' })
  date: Date;

  @Column({ name: 'transcript_s3_key', nullable: true })
  transcriptS3Key: string;

  @Column({ name: 'transcript_text', type: 'text', nullable: true })
  transcriptText: string;

  @Column({
    type: 'enum',
    enum: MeetingStatus,
    default: MeetingStatus.UPLOADING,
  })
  status: MeetingStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    duration?: number;
    participants?: string[];
    source?: 'zoom' | 'teams' | 'meet' | 'manual';
    language?: string;
    diarization?: any;
  };

  @Column({ type: 'jsonb', nullable: true })
  processingResult: {
    speakerTurns?: any[];
    roleTags?: Record<string, string>;
    language?: string;
    confidence?: number;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Project, (project) => project.meetings)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @OneToMany(() => Decision, (decision) => decision.meeting)
  decisions: Decision[];

  @OneToMany(() => Draft, (draft) => draft.meeting)
  drafts: Draft[];
}

