import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInitialTables1704067200000 implements MigrationInterface {
  name = 'CreateInitialTables1704067200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      CREATE TYPE "public"."meeting_status_enum" AS ENUM('uploading', 'processing', 'completed', 'failed')
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."decision_type_enum" AS ENUM('obligation', 'deadline', 'approval', 'deliverable', 'commitment')
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."clause_category_enum" AS ENUM('confidentiality', 'intellectual_property', 'payment_terms', 'termination', 'liability', 'governing_law', 'dispute_resolution', 'force_majeure', 'general')
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."jurisdiction_enum" AS ENUM('US', 'UK', 'EU', 'APAC', 'global')
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."contract_type_enum" AS ENUM('nda', 'mou', 'sow', 'sla', 'project_agreement')
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."draft_status_enum" AS ENUM('drafting', 'completed', 'reviewing', 'approved', 'rejected')
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."export_format_enum" AS ENUM('docx', 'pdf', 'markdown', 'json')
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."export_status_enum" AS ENUM('pending', 'processing', 'completed', 'failed')
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."audit_action_enum" AS ENUM('create', 'read', 'update', 'delete', 'export', 'login', 'logout', 'upload', 'process')
    `);

    // Create projects table
    await queryRunner.query(`
      CREATE TABLE "projects" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" character varying NOT NULL,
        "name" character varying NOT NULL,
        "description" text,
        "active" boolean NOT NULL DEFAULT true,
        "settings" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_6271df0a7aed1d6c0691ce6a50e" PRIMARY KEY ("id")
      )
    `);

    // Create meetings table
    await queryRunner.query(`
      CREATE TABLE "meetings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" character varying NOT NULL,
        "project_id" uuid NOT NULL,
        "title" character varying NOT NULL,
        "date" TIMESTAMP NOT NULL,
        "transcript_s3_key" character varying,
        "transcript_text" text,
        "status" "public"."meeting_status_enum" NOT NULL DEFAULT 'uploading',
        "metadata" jsonb,
        "processing_result" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_aa73be861afa77eb4ed31f3ed57" PRIMARY KEY ("id")
      )
    `);

    // Create decisions table
    await queryRunner.query(`
      CREATE TABLE "decisions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" character varying NOT NULL,
        "meeting_id" uuid NOT NULL,
        "description" character varying NOT NULL,
        "type" "public"."decision_type_enum" NOT NULL DEFAULT 'obligation',
        "responsible_party" character varying,
        "deadline" TIMESTAMP,
        "value" numeric(15,2),
        "value_currency" character varying NOT NULL DEFAULT 'USD',
        "entities" jsonb,
        "spans" jsonb,
        "confidence" numeric(3,2) NOT NULL DEFAULT '0',
        "manually_edited" boolean NOT NULL DEFAULT false,
        "meta" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_0c8b96e1a8cba5cf6b2f5c5b5b5" PRIMARY KEY ("id")
      )
    `);

    // Create clauses table
    await queryRunner.query(`
      CREATE TABLE "clauses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "text" text NOT NULL,
        "category" "public"."clause_category_enum" NOT NULL DEFAULT 'general',
        "jurisdiction" "public"."jurisdiction_enum" NOT NULL DEFAULT 'global',
        "source" character varying,
        "description" text,
        "risk_flags" jsonb,
        "placeholders" jsonb,
        "variants" jsonb,
        "metadata" jsonb,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_0c8b96e1a8cba5cf6b2f5c5b5b6" PRIMARY KEY ("id")
      )
    `);

    // Create drafts table
    await queryRunner.query(`
      CREATE TABLE "drafts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" character varying NOT NULL,
        "meeting_id" uuid NOT NULL,
        "contract_type" "public"."contract_type_enum" NOT NULL DEFAULT 'nda',
        "status" "public"."draft_status_enum" NOT NULL DEFAULT 'drafting',
        "s3_docx_key" character varying,
        "s3_pdf_key" character varying,
        "json_bundle" jsonb,
        "placeholders" jsonb,
        "deviations" jsonb,
        "metadata" jsonb,
        "version" integer NOT NULL DEFAULT '1',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_0c8b96e1a8cba5cf6b2f5c5b5b7" PRIMARY KEY ("id")
      )
    `);

    // Create qa_pairs table
    await queryRunner.query(`
      CREATE TABLE "qa_pairs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" character varying NOT NULL,
        "draft_id" uuid NOT NULL,
        "question" text NOT NULL,
        "answer" text NOT NULL,
        "confidence" numeric(3,2) NOT NULL DEFAULT '0',
        "citations" jsonb,
        "metadata" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_0c8b96e1a8cba5cf6b2f5c5b5b8" PRIMARY KEY ("id")
      )
    `);

    // Create exports table
    await queryRunner.query(`
      CREATE TABLE "exports" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" character varying NOT NULL,
        "draft_id" uuid NOT NULL,
        "format" "public"."export_format_enum" NOT NULL DEFAULT 'docx',
        "status" "public"."export_status_enum" NOT NULL DEFAULT 'pending',
        "s3_key" character varying,
        "file_size" bigint,
        "download_url" character varying,
        "expires_at" TIMESTAMP,
        "metadata" jsonb,
        "error" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_0c8b96e1a8cba5cf6b2f5c5b5b9" PRIMARY KEY ("id")
      )
    `);

    // Create audit_log table
    await queryRunner.query(`
      CREATE TABLE "audit_log" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" character varying NOT NULL,
        "user_id" character varying,
        "session_id" character varying,
        "request_id" character varying,
        "action" "public"."audit_action_enum" NOT NULL,
        "resource_type" character varying,
        "resource_id" character varying,
        "changes" jsonb,
        "metadata" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_0c8b96e1a8cba5cf6b2f5c5b5c0" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_projects_organization_id" ON "projects" ("organization_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_meetings_project_id" ON "meetings" ("project_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_meetings_organization_id" ON "meetings" ("organization_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_decisions_meeting_id" ON "decisions" ("meeting_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_decisions_organization_id" ON "decisions" ("organization_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_clauses_category" ON "clauses" ("category")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_clauses_jurisdiction" ON "clauses" ("jurisdiction")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_clauses_source" ON "clauses" ("source")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_drafts_meeting_id" ON "drafts" ("meeting_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_drafts_organization_id" ON "drafts" ("organization_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_drafts_contract_type" ON "drafts" ("contract_type")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_qa_pairs_draft_id" ON "qa_pairs" ("draft_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_qa_pairs_organization_id" ON "qa_pairs" ("organization_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_exports_draft_id" ON "exports" ("draft_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_exports_organization_id" ON "exports" ("organization_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_exports_format" ON "exports" ("format")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_audit_log_organization_id" ON "audit_log" ("organization_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_audit_log_user_id" ON "audit_log" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_audit_log_resource" ON "audit_log" ("resource_type", "resource_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_audit_log_action" ON "audit_log" ("action")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_audit_log_created_at" ON "audit_log" ("created_at")
    `);

    // Create foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "meetings" ADD CONSTRAINT "FK_meetings_project_id" 
      FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "decisions" ADD CONSTRAINT "FK_decisions_meeting_id" 
      FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "drafts" ADD CONSTRAINT "FK_drafts_meeting_id" 
      FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "qa_pairs" ADD CONSTRAINT "FK_qa_pairs_draft_id" 
      FOREIGN KEY ("draft_id") REFERENCES "drafts"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "exports" ADD CONSTRAINT "FK_exports_draft_id" 
      FOREIGN KEY ("draft_id") REFERENCES "drafts"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(`ALTER TABLE "exports" DROP CONSTRAINT "FK_exports_draft_id"`);
    await queryRunner.query(`ALTER TABLE "qa_pairs" DROP CONSTRAINT "FK_qa_pairs_draft_id"`);
    await queryRunner.query(`ALTER TABLE "drafts" DROP CONSTRAINT "FK_drafts_meeting_id"`);
    await queryRunner.query(`ALTER TABLE "decisions" DROP CONSTRAINT "FK_decisions_meeting_id"`);
    await queryRunner.query(`ALTER TABLE "meetings" DROP CONSTRAINT "FK_meetings_project_id"`);

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_audit_log_created_at"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_log_action"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_log_resource"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_log_user_id"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_log_organization_id"`);
    await queryRunner.query(`DROP INDEX "IDX_exports_format"`);
    await queryRunner.query(`DROP INDEX "IDX_exports_organization_id"`);
    await queryRunner.query(`DROP INDEX "IDX_exports_draft_id"`);
    await queryRunner.query(`DROP INDEX "IDX_qa_pairs_organization_id"`);
    await queryRunner.query(`DROP INDEX "IDX_qa_pairs_draft_id"`);
    await queryRunner.query(`DROP INDEX "IDX_drafts_contract_type"`);
    await queryRunner.query(`DROP INDEX "IDX_drafts_organization_id"`);
    await queryRunner.query(`DROP INDEX "IDX_drafts_meeting_id"`);
    await queryRunner.query(`DROP INDEX "IDX_clauses_source"`);
    await queryRunner.query(`DROP INDEX "IDX_clauses_jurisdiction"`);
    await queryRunner.query(`DROP INDEX "IDX_clauses_category"`);
    await queryRunner.query(`DROP INDEX "IDX_decisions_organization_id"`);
    await queryRunner.query(`DROP INDEX "IDX_decisions_meeting_id"`);
    await queryRunner.query(`DROP INDEX "IDX_meetings_organization_id"`);
    await queryRunner.query(`DROP INDEX "IDX_meetings_project_id"`);
    await queryRunner.query(`DROP INDEX "IDX_projects_organization_id"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "audit_log"`);
    await queryRunner.query(`DROP TABLE "exports"`);
    await queryRunner.query(`DROP TABLE "qa_pairs"`);
    await queryRunner.query(`DROP TABLE "drafts"`);
    await queryRunner.query(`DROP TABLE "clauses"`);
    await queryRunner.query(`DROP TABLE "decisions"`);
    await queryRunner.query(`DROP TABLE "meetings"`);
    await queryRunner.query(`DROP TABLE "projects"`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE "public"."audit_action_enum"`);
    await queryRunner.query(`DROP TYPE "public"."export_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."export_format_enum"`);
    await queryRunner.query(`DROP TYPE "public"."draft_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."contract_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."jurisdiction_enum"`);
    await queryRunner.query(`DROP TYPE "public"."clause_category_enum"`);
    await queryRunner.query(`DROP TYPE "public"."decision_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."meeting_status_enum"`);
  }
}

