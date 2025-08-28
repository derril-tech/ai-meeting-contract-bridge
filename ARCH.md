# AI Meeting Contract Bridge — Architecture (V1)

## 1) System Overview
**Frontend/BFF:** Next.js 14 (Vercel) — SSR for contract viewer; ISR for review links; Server Actions for uploads/exports.  
**API Gateway:** NestJS (Node 20) — REST **/v1** with OpenAPI 3.1, Zod validation, Problem+JSON, RBAC (Casbin), Postgres RLS, Idempotency‑Key, Request‑ID.  
**Workers (Python 3.11 + FastAPI):**
- **transcript-worker** (parse transcripts/minutes; diarize; role tagging; language detection)
- **decision-worker** (obligation/deadline/entity extraction; provenance spans; confidence)
- **draft-worker** (clause retrieval + assembly; jurisdiction/industry variants; placeholder tracking)
- **qa-worker** (explanations, risk/missing detection, prep notes; citations to library + meeting spans)
- **export-worker** (DOCX/PDF/Markdown/JSON bundles; numbering & TOC)

**Event Bus/Queues:** NATS subjects (`meeting.ingest`, `decisions.extract`, `draft.make`, `qa.ask`, `export.make`) + Redis Streams (DLQ); Celery/RQ orchestration.  
**Datastores:** Postgres 16 (projects/meetings/decisions/clauses/drafts/qa/exports/audit), S3/R2 (transcripts, exports), Redis (cache/session).  
**Observability:** OpenTelemetry (traces/metrics/logs), Prometheus/Grafana; Sentry for error tracking.  
**Security:** TLS/HSTS/CSP; KMS‑wrapped secrets; per‑tenant encryption keys; signed URLs; RLS; audit logs; GDPR/DSR endpoints.  
**Disclaimer:** All drafts watermarked **“Not legally binding until reviewed by counsel.”**

## 2) Data Model (summary)
- **projects** (org‑scoped workspaces).  
- **meetings** (title, date, transcript_s3, status).  
- **decisions** (description, responsible_party, deadline, value, meta).  
- **clauses** (category, text, jurisdiction, source, risk flags).  
- **drafts** (meeting_id, contract_type, s3_docx/s3_pdf, json_bundle, status).  
- **qa_pairs** (draft_id, question, answer, confidence).  
- **exports** (draft_id, kind, s3_key).  
- **audit_log** (immutable trail).

**Invariants**
- Every draft links to ≥1 meeting and its decisions; obligations table aligns with clauses.
- Placeholders (TBD fields) are flagged until resolved; exports embed provenance.
- Jurisdiction & industry variants recorded on clause selection.

## 3) Key Flows

### 3.1 Ingest → Decisions
1. Upload transcript/minutes → **transcript-worker** parses, diarizes, tags roles.  
2. **decision-worker** extracts obligations, deadlines, parties, amounts, governing law; stores spans & confidence; SSE progress.

### 3.2 Drafting
1. User selects contract type (NDA/MoU/SoW/SLA).  
2. **draft-worker** selects clauses (semantic + keyword filters; jurisdiction/industry variants), fills with decision/entity values; marks TBD where unknown; computes deviations vs standard templates.  
3. Contract saved with tracked placeholders and deviation map.

### 3.3 QA & Coaching
1. **qa-worker** answers “why” questions; explains risks/missing items; produces prep notes; citations to clause sources + meeting spans.  
2. Inline suggestions surface in **ContractEditor**; reviewer can accept/modify.

### 3.4 Export & Governance
1. **export-worker** renders DOCX/PDF/Markdown with numbering, cross‑refs, watermark; JSON bundle for CLM integration.  
2. Versioned exports logged with encrypted metadata; audit updated.

## 4) API Surface (/v1)
- **Meetings:** `POST /meetings/upload { project_id, file }`, `GET /meetings/:id/decisions`  
- **Drafts:** `POST /drafts/generate { meeting_id, type }`, `GET /drafts/:id`  
- **Clauses:** `GET /clauses/search?jurisdiction=US&category=confidentiality`, `POST /clauses/custom`  
- **QA:** `POST /qa { draft_id, question }`  
- **Exports:** `POST /exports { draft_id, format:"docx|pdf|json" }`  
**Conventions:** OpenAPI 3.1; Problem+JSON errors; cursor pagination; SSE for long jobs; Idempotency‑Key on mutations.

## 5) Observability & SLOs
- **Spans:** meeting.parse, decision.extract, draft.make, qa.answer, export.render.  
- **SLO Targets:** Transcript parse (60‑min) < 30 s p95; draft gen (≈5p) < 12 s p95; export < 5 s p95; pipeline success ≥ 99% (excl. bad inputs).  
- **Metrics:** extraction precision/recall; draft completeness; placeholder rate; export p95; error rates.

## 6) Security & Governance
- RLS tenant isolation; Casbin RBAC (Owner/Editor/Reviewer/Viewer).  
- Per‑tenant encryption keys; signed URLs (short TTL).  
- Audit trail of drafts/edits/exports; DSR/export/delete APIs; confidentiality banner.  
- Clause sources open‑licensed; method cards show source and last‑updated date.

## 7) Performance & Scaling
- Cache frequent clause templates & embeddings; incremental drafting on decision updates.  
- Worker autoscaling by queue depth; DLQ with backoff/jitter.  
- Chunked uploads; CDN for exports; pre‑render previews when possible.

## 8) Accessibility & i18n
- Keyboard navigation across DecisionTable and ContractEditor; screen‑reader labels for clauses.  
- Multilingual drafts (translate to EN/FR/DE/ES/JP); localized dates/currencies.  
- High‑contrast themes; focus rings; ARIA for tables/forms.

## 9) Compliance & Safety
- Watermark & disclaimer on all drafts; risky/missing flags surfaced before export.  
- Jurisdictional variant gating; industry add‑on libraries curated and versioned.  
- No model retention of customer data unless expressly opted‑in.