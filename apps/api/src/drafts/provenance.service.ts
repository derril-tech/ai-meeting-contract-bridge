import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Draft } from '../database/entities/draft.entity';
import { Meeting } from '../database/entities/meeting.entity';
import { Decision } from '../database/entities/decision.entity';
import { Clause } from '../database/entities/clause.entity';

export interface ProvenanceData {
  meetingId: string;
  meetingTitle: string;
  meetingDate: Date;
  transcriptHash: string;
  decisionsUsed: Array<{
    id: string;
    type: string;
    description: string;
    confidence: number;
    spans: Array<{
      start: number;
      end: number;
      text: string;
    }>;
  }>;
  clausesUsed: Array<{
    id: string;
    title: string;
    category: string;
    jurisdiction: string;
    source: string;
    version: string;
  }>;
  placeholders: Array<{
    name: string;
    type: string;
    required: boolean;
    sourceDecision?: string;
    defaultValue?: string;
  }>;
  generationTimestamp: Date;
  modelVersion: string;
  processingPipeline: string[];
}

@Injectable()
export class ProvenanceService {
  constructor(
    @InjectRepository(Draft)
    private draftsRepository: Repository<Draft>,
    @InjectRepository(Meeting)
    private meetingsRepository: Repository<Meeting>,
    @InjectRepository(Decision)
    private decisionsRepository: Repository<Decision>,
    @InjectRepository(Clause)
    private clausesRepository: Repository<Clause>,
  ) {}

  async generateProvenance(
    draftId: string,
    meetingId: string,
    decisionsUsed: string[],
    clausesUsed: string[],
    placeholders: any[],
  ): Promise<ProvenanceData> {
    // Fetch meeting details
    const meeting = await this.meetingsRepository.findOne({
      where: { id: meetingId },
    });

    if (!meeting) {
      throw new Error('Meeting not found');
    }

    // Fetch decisions with spans
    const decisions = await this.decisionsRepository.findByIds(decisionsUsed);

    // Fetch clauses with metadata
    const clauses = await this.clausesRepository.findByIds(clausesUsed);

    // Generate transcript hash for integrity checking
    const transcriptHash = this.generateTranscriptHash(meeting.transcriptText || '');

    const provenance: ProvenanceData = {
      meetingId,
      meetingTitle: meeting.title,
      meetingDate: meeting.date,
      transcriptHash,
      decisionsUsed: decisions.map(decision => ({
        id: decision.id,
        type: decision.type,
        description: decision.description,
        confidence: decision.confidence,
        spans: decision.spans || [],
      })),
      clausesUsed: clauses.map(clause => ({
        id: clause.id,
        title: clause.title,
        category: clause.category,
        jurisdiction: clause.jurisdiction,
        source: clause.source || 'system',
        version: clause.metadata?.version || '1.0',
      })),
      placeholders: placeholders.map(placeholder => ({
        name: placeholder.name,
        type: placeholder.type,
        required: placeholder.required,
        sourceDecision: placeholder.sourceDecision,
        defaultValue: placeholder.defaultValue,
      })),
      generationTimestamp: new Date(),
      modelVersion: '1.0.0',
      processingPipeline: [
        'transcript.ingest',
        'speaker.diarization',
        'role.tagging',
        'decision.extraction',
        'clause.retrieval',
        'draft.generation',
        'placeholder.identification',
        'provenance.tracking',
      ],
    };

    return provenance;
  }

  async embedProvenanceInDraft(draftId: string, provenance: ProvenanceData): Promise<void> {
    await this.draftsRepository.update(draftId, {
      jsonBundle: {
        ...((await this.draftsRepository.findOne({ where: { id: draftId } }))?.jsonBundle || {}),
        provenance,
      },
    });
  }

  async verifyProvenanceIntegrity(draftId: string): Promise<boolean> {
    const draft = await this.draftsRepository.findOne({
      where: { id: draftId },
      relations: ['meeting'],
    });

    if (!draft || !draft.jsonBundle?.provenance) {
      return false;
    }

    const provenance = draft.jsonBundle.provenance as ProvenanceData;

    // Verify meeting still exists and matches
    if (!draft.meeting || draft.meeting.id !== provenance.meetingId) {
      return false;
    }

    // Verify transcript integrity
    const currentTranscriptHash = this.generateTranscriptHash(draft.meeting.transcriptText || '');
    if (currentTranscriptHash !== provenance.transcriptHash) {
      return false;
    }

    // Verify decisions still exist
    const decisionIds = provenance.decisionsUsed.map(d => d.id);
    const existingDecisions = await this.decisionsRepository.findByIds(decisionIds);
    if (existingDecisions.length !== decisionIds.length) {
      return false;
    }

    // Verify clauses still exist
    const clauseIds = provenance.clausesUsed.map(c => c.id);
    const existingClauses = await this.clausesRepository.findByIds(clauseIds);
    if (existingClauses.length !== clauseIds.length) {
      return false;
    }

    return true;
  }

  async getProvenanceChain(draftId: string): Promise<ProvenanceData[]> {
    const draft = await this.draftsRepository.findOne({
      where: { id: draftId },
    });

    if (!draft?.jsonBundle?.provenance) {
      return [];
    }

    // In a real system, this would trace through version history
    return [draft.jsonBundle.provenance as ProvenanceData];
  }

  private generateTranscriptHash(transcript: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(transcript).digest('hex');
  }

  async exportProvenanceReport(draftId: string): Promise<any> {
    const provenance = await this.getProvenanceChain(draftId);
    if (provenance.length === 0) {
      throw new Error('No provenance data found');
    }

    const latestProvenance = provenance[0];
    const integrityCheck = await this.verifyProvenanceIntegrity(draftId);

    return {
      draftId,
      integrityVerified: integrityCheck,
      generatedAt: latestProvenance.generationTimestamp,
      meeting: {
        id: latestProvenance.meetingId,
        title: latestProvenance.meetingTitle,
        date: latestProvenance.meetingDate,
        transcriptHash: latestProvenance.transcriptHash,
      },
      decisions: latestProvenance.decisionsUsed,
      clauses: latestProvenance.clausesUsed,
      placeholders: latestProvenance.placeholders,
      processingPipeline: latestProvenance.processingPipeline,
      modelVersion: latestProvenance.modelVersion,
      reportGeneratedAt: new Date(),
    };
  }

  async detectProvenanceDrift(draftId: string): Promise<any[]> {
    const draft = await this.draftsRepository.findOne({
      where: { id: draftId },
      relations: ['meeting'],
    });

    if (!draft?.jsonBundle?.provenance) {
      return [];
    }

    const provenance = draft.jsonBundle.provenance as ProvenanceData;
    const drifts = [];

    // Check for decision changes
    const currentDecisions = await this.decisionsRepository.find({
      where: { meetingId: provenance.meetingId },
    });

    const provenanceDecisionIds = new Set(provenance.decisionsUsed.map(d => d.id));
    const currentDecisionIds = new Set(currentDecisions.map(d => d.id));

    // Find added decisions
    for (const decision of currentDecisions) {
      if (!provenanceDecisionIds.has(decision.id)) {
        drifts.push({
          type: 'decision_added',
          severity: 'medium',
          description: `New decision extracted: ${decision.description}`,
          entityId: decision.id,
        });
      }
    }

    // Find removed decisions
    for (const decisionId of provenanceDecisionIds) {
      if (!currentDecisionIds.has(decisionId)) {
        drifts.push({
          type: 'decision_removed',
          severity: 'high',
          description: `Decision no longer exists: ${decisionId}`,
          entityId: decisionId,
        });
      }
    }

    // Check for clause changes
    for (const clause of provenance.clausesUsed) {
      const currentClause = await this.clausesRepository.findOne({
        where: { id: clause.id },
      });

      if (!currentClause) {
        drifts.push({
          type: 'clause_deleted',
          severity: 'high',
          description: `Clause no longer exists: ${clause.title}`,
          entityId: clause.id,
        });
      } else if (currentClause.updatedAt > provenance.generationTimestamp) {
        drifts.push({
          type: 'clause_updated',
          severity: 'medium',
          description: `Clause updated since draft generation: ${clause.title}`,
          entityId: clause.id,
        });
      }
    }

    return drifts;
  }
}
