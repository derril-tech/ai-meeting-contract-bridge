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

@Entity('qa_pairs')
@Index(['draft_id'])
@Index(['organization_id'])
export class QaPair {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column({ name: 'draft_id' })
  draftId: string;

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'text' })
  answer: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0.0 })
  confidence: number;

  @Column({ type: 'jsonb', nullable: true })
  citations: {
    clauseIds?: string[];
    meetingSpans?: Array<{
      start: number;
      end: number;
      text: string;
    }>;
    sources?: string[];
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    questionType?: 'why_clause' | 'missing_risk' | 'prep_notes' | 'general';
    riskLevel?: 'low' | 'medium' | 'high';
    category?: string;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Draft, (draft) => draft.qaPairs)
  @JoinColumn({ name: 'draft_id' })
  draft: Draft;
}

