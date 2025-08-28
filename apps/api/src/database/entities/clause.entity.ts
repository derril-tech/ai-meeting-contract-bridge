import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ClauseCategory {
  CONFIDENTIALITY = 'confidentiality',
  INTELLECTUAL_PROPERTY = 'intellectual_property',
  PAYMENT_TERMS = 'payment_terms',
  TERMINATION = 'termination',
  LIABILITY = 'liability',
  GOVERNING_LAW = 'governing_law',
  DISPUTE_RESOLUTION = 'dispute_resolution',
  FORCE_MAJEURE = 'force_majeure',
  GENERAL = 'general',
}

export enum Jurisdiction {
  US = 'US',
  UK = 'UK',
  EU = 'EU',
  APAC = 'APAC',
  GLOBAL = 'global',
}

@Entity('clauses')
@Index(['category'])
@Index(['jurisdiction'])
@Index(['source'])
export class Clause {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  text: string;

  @Column({
    type: 'enum',
    enum: ClauseCategory,
    default: ClauseCategory.GENERAL,
  })
  category: ClauseCategory;

  @Column({
    type: 'enum',
    enum: Jurisdiction,
    default: Jurisdiction.GLOBAL,
  })
  jurisdiction: Jurisdiction;

  @Column({ nullable: true })
  source: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  riskFlags: {
    highRisk?: boolean;
    requiresReview?: boolean;
    jurisdictionSpecific?: boolean;
    industrySpecific?: boolean;
  };

  @Column({ type: 'jsonb', nullable: true })
  placeholders: {
    name: string;
    description: string;
    required: boolean;
    type: 'string' | 'date' | 'number' | 'party' | 'organization';
  }[];

  @Column({ type: 'jsonb', nullable: true })
  variants: {
    jurisdiction: Jurisdiction;
    text: string;
    differences: string[];
  }[];

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    version?: string;
    lastUpdated?: string;
    author?: string;
    license?: string;
    tags?: string[];
  };

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

