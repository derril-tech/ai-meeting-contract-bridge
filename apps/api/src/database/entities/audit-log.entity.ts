import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AuditAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  EXPORT = 'export',
  LOGIN = 'login',
  LOGOUT = 'logout',
  UPLOAD = 'upload',
  PROCESS = 'process',
}

@Entity('audit_log')
@Index(['organization_id'])
@Index(['user_id'])
@Index(['resource_type', 'resource_id'])
@Index(['action'])
@Index(['created_at'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @Column({ name: 'session_id', nullable: true })
  sessionId: string;

  @Column({ name: 'request_id', nullable: true })
  requestId: string;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action: AuditAction;

  @Column({ name: 'resource_type', nullable: true })
  resourceType: string;

  @Column({ name: 'resource_id', nullable: true })
  resourceId: string;

  @Column({ type: 'jsonb', nullable: true })
  changes: {
    before?: any;
    after?: any;
    fields?: string[];
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    ip?: string;
    userAgent?: string;
    endpoint?: string;
    method?: string;
    statusCode?: number;
    duration?: number;
    error?: string;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

