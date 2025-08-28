import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { Meeting } from '../../database/entities/meeting.entity';
import { Decision } from '../../database/entities/decision.entity';
import { Draft } from '../../database/entities/draft.entity';
import { QaPair } from '../../database/entities/qa-pair.entity';
import { Export } from '../../database/entities/export.entity';

describe('Meeting to Contract E2E (NDA/MoU/SoW)', () => {
  let app: INestApplication;
  let meetingId: string;
  let draftId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete NDA Workflow', () => {
    it('should process NDA meeting end-to-end', async () => {
      // Upload NDA meeting transcript
      const uploadResponse = await request(app.getHttpServer())
        .post('/v1/meetings/upload')
        .attach('file', Buffer.from(mockNdaTranscript), 'nda-meeting.txt')
        .field('title', 'NDA Discussion - Tech Startup')
        .field('date', '2024-01-15T14:00:00Z')
        .expect(201);

      meetingId = uploadResponse.body.id;
      expect(meetingId).toBeDefined();

      // Wait for processing to complete (simulate async processing)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check meeting processing status
      const meetingResponse = await request(app.getHttpServer())
        .get(`/v1/meetings/${meetingId}`)
        .expect(200);

      expect(meetingResponse.body.status).toBe('completed');

      // Verify decisions were extracted
      const decisionsResponse = await request(app.getHttpServer())
        .get(`/v1/meetings/${meetingId}/decisions`)
        .expect(200);

      expect(decisionsResponse.body.decisions).toBeDefined();
      expect(decisionsResponse.body.decisions.length).toBeGreaterThan(0);

      // Verify confidentiality obligations were extracted
      const confidentialityDecisions = decisionsResponse.body.decisions.filter(
        (d: any) => d.type === 'obligation' && d.description.toLowerCase().includes('confidential')
      );
      expect(confidentialityDecisions.length).toBeGreaterThan(0);

      // Generate NDA draft
      const draftResponse = await request(app.getHttpServer())
        .post('/v1/drafts/generate')
        .send({
          meetingId,
          contractType: 'nda',
          jurisdiction: 'US',
        })
        .expect(201);

      draftId = draftResponse.body.id;
      expect(draftId).toBeDefined();

      // Wait for draft generation
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify draft was generated
      const draftDetailsResponse = await request(app.getHttpServer())
        .get(`/v1/drafts/${draftId}`)
        .expect(200);

      expect(draftDetailsResponse.body.contractType).toBe('nda');
      expect(draftDetailsResponse.body.placeholders).toBeDefined();
      expect(draftDetailsResponse.body.placeholders.length).toBeGreaterThan(0);

      // Verify provenance tracking
      expect(draftDetailsResponse.body.metadata).toBeDefined();
      expect(draftDetailsResponse.body.metadata.provenance).toBeDefined();
      expect(draftDetailsResponse.body.metadata.provenance.meetingId).toBe(meetingId);

      // Test QA functionality
      const qaResponse = await request(app.getHttpServer())
        .post(`/v1/drafts/${draftId}/qa`)
        .send({
          question: 'Why is the confidentiality period set to 5 years?',
        })
        .expect(200);

      expect(qaResponse.body.answer).toBeDefined();
      expect(qaResponse.body.confidence).toBeGreaterThan(0);

      // Export as DOCX
      const exportResponse = await request(app.getHttpServer())
        .post(`/v1/drafts/${draftId}/export`)
        .send({ format: 'docx' })
        .expect(201);

      expect(exportResponse.body.downloadUrl).toBeDefined();
      expect(exportResponse.body.format).toBe('docx');

      // Export as PDF
      const pdfExportResponse = await request(app.getHttpServer())
        .post(`/v1/drafts/${draftId}/export`)
        .send({ format: 'pdf' })
        .expect(201);

      expect(pdfExportResponse.body.downloadUrl).toBeDefined();
      expect(pdfExportResponse.body.format).toBe('pdf');
    });
  });

  describe('Complete MoU Workflow', () => {
    it('should process MoU meeting end-to-end', async () => {
      // Upload MoU meeting transcript
      const uploadResponse = await request(app.getHttpServer())
        .post('/v1/meetings/upload')
        .attach('file', Buffer.from(mockMouTranscript), 'mou-meeting.txt')
        .field('title', 'MoU Discussion - Partnership Agreement')
        .field('date', '2024-01-20T10:00:00Z')
        .expect(201);

      const mouMeetingId = uploadResponse.body.id;

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate MoU draft
      const draftResponse = await request(app.getHttpServer())
        .post('/v1/drafts/generate')
        .send({
          meetingId: mouMeetingId,
          contractType: 'mou',
          jurisdiction: 'UK',
        })
        .expect(201);

      const mouDraftId = draftResponse.body.id;

      // Wait for generation
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify MoU-specific clauses
      const draftDetailsResponse = await request(app.getHttpServer())
        .get(`/v1/drafts/${mouDraftId}`)
        .expect(200);

      expect(draftDetailsResponse.body.contractType).toBe('mou');
      expect(draftDetailsResponse.body.metadata.jurisdiction).toBe('UK');

      // Test MoU-specific QA
      const qaResponse = await request(app.getHttpServer())
        .post(`/v1/drafts/${mouDraftId}/qa`)
        .send({
          question: 'What are the main objectives outlined in this MoU?',
        })
        .expect(200);

      expect(qaResponse.body.answer).toContain('objective');
    });
  });

  describe('Complete SoW Workflow', () => {
    it('should process SoW meeting end-to-end', async () => {
      // Upload SoW meeting transcript
      const uploadResponse = await request(app.getHttpServer())
        .post('/v1/meetings/upload')
        .attach('file', Buffer.from(mockSowTranscript), 'sow-meeting.txt')
        .field('title', 'SoW Discussion - Development Project')
        .field('date', '2024-01-25T16:00:00Z')
        .expect(201);

      const sowMeetingId = uploadResponse.body.id;

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate SoW draft
      const draftResponse = await request(app.getHttpServer())
        .post('/v1/drafts/generate')
        .send({
          meetingId: sowMeetingId,
          contractType: 'sow',
          jurisdiction: 'EU',
        })
        .expect(201);

      const sowDraftId = draftResponse.body.id;

      // Wait for generation
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify SoW-specific content
      const draftDetailsResponse = await request(app.getHttpServer())
        .get(`/v1/drafts/${sowDraftId}`)
        .expect(200);

      expect(draftDetailsResponse.body.contractType).toBe('sow');
      expect(draftDetailsResponse.body.metadata.jurisdiction).toBe('EU');

      // Verify deliverables and timelines
      const decisionsResponse = await request(app.getHttpServer())
        .get(`/v1/meetings/${sowMeetingId}/decisions`)
        .expect(200);

      const deliverables = decisionsResponse.body.decisions.filter(
        (d: any) => d.type === 'deliverable'
      );
      expect(deliverables.length).toBeGreaterThan(0);

      const deadlines = decisionsResponse.body.decisions.filter(
        (d: any) => d.deadline
      );
      expect(deadlines.length).toBeGreaterThan(0);
    });
  });

  describe('Deterministic Exports', () => {
    it('should produce identical exports for same input', async () => {
      // Generate first export
      const export1Response = await request(app.getHttpServer())
        .post(`/v1/drafts/${draftId}/export`)
        .send({ format: 'json' })
        .expect(201);

      // Generate second export
      const export2Response = await request(app.getHttpServer())
        .post(`/v1/drafts/${draftId}/export`)
        .send({ format: 'json' })
        .expect(201);

      // Compare export metadata (excluding timestamps)
      const export1Metadata = { ...export1Response.body };
      const export2Metadata = { ...export2Response.body };

      delete export1Metadata.createdAt;
      delete export1Metadata.expiresAt;
      delete export2Metadata.createdAt;
      delete export2Metadata.expiresAt;

      expect(export1Metadata).toEqual(export2Metadata);
    });
  });
});

// Mock transcript data
const mockNdaTranscript = `
Meeting Transcript: NDA Discussion
Date: January 15, 2024

[00:00] Alice: Good morning everyone. Today we're discussing the NDA for our partnership with TechCorp.

[00:15] Bob: The confidentiality period should be 5 years from the date of termination.

[00:30] Alice: Agreed. The receiving party shall not disclose confidential information to third parties without prior written consent.

[01:00] Charlie: What about the governing law? Should we use Delaware law since we're both US companies?

[01:15] Bob: Delaware law makes sense for intellectual property protection.

[01:30] Alice: Also, we need to define what constitutes confidential information - technical data, business plans, customer lists.

[02:00] Meeting concluded with agreement on all key terms.
`;

const mockMouTranscript = `
Meeting Transcript: MoU Partnership Discussion
Date: January 20, 2024

[00:00] Sarah: Welcome to our MoU discussion for the strategic partnership.

[00:15] Mike: The main objectives are to collaborate on research, share resources, and explore joint ventures.

[00:45] Sarah: We'll have quarterly review meetings to assess progress.

[01:00] David: The MoU will be non-binding but create a framework for future agreements.

[01:30] Sarah: Both parties will contribute equally to joint projects.

[02:00] Meeting concluded with clear objectives and next steps.
`;

const mockSowTranscript = `
Meeting Transcript: SoW Development Project
Date: January 25, 2024

[00:00] John: Let's outline the scope of work for the mobile app development.

[00:15] Mary: Deliverables include: design mockups by March 1, MVP by June 1, final release by September 1.

[00:45] John: The budget is $150,000 with 50% upfront payment.

[01:00] Mary: We'll use Agile methodology with bi-weekly sprints.

[01:30] John: Acceptance criteria: all features tested, documentation complete, 95% uptime in staging.

[02:00] David: Timeline is tight but achievable with the proposed milestones.

[02:30] Meeting concluded with detailed scope and deliverables.
`;
