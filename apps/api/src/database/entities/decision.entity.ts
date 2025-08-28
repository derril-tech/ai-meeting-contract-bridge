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
import { Meeting } from './meeting.entity';

export enum DecisionType {
  OBLIGATION = 'obligation',
  DEADLINE = 'deadline',
  APPROVAL = 'approval',
  DELIVERABLE = 'deliverable',
  COMMITMENT = 'commitment',
}

@Entity('decisions')
@Index(['meeting_id'])
@Index(['organization_id'])
export class Decision {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column({ name: 'meeting_id' })
  meetingId: string;

  @Column()
  description: string;

  @Column({
    type: 'enum',
    enum: DecisionType,
    default: DecisionType.OBLIGATION,
  })
  type: DecisionType;

  @Column({ name: 'responsible_party', nullable: true })
  responsibleParty: string;

  @Column({ type: 'timestamp', nullable: true })
  deadline: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  value: number;

  @Column({ name: 'value_currency', default: 'USD' })
  valueCurrency: string;

  @Column({ type: 'jsonb', nullable: true })
  entities: {
    parties?: string[];
    organizations?: string[];
    amounts?: Array<{ value: number; currency: string; context: string }>;
    dates?: Array<{ date: string; context: string }>;
    governingLaw?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  spans: {
    start: number;
    end: number;
    text: string;
    confidence: number;
  }[];

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0.0 })
  confidence: number;

  @Column({ default: false })
  manuallyEdited: boolean;

  @Column({ type: 'jsonb', nullable: true })
  meta: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Meeting, (meeting) => meeting.decisions)
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting;
}

