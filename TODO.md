# AI Meeting Contract Bridge — TODO (V1, Phased)

> Owner tags: **[FE]**, **[BE]**, **[NLP]**, **[MLE]**, **[SRE]**, **[QA]**, **[PM]**  
> Exactly **5** substantial phases.

---

## Phase 1: Foundations, Infra & Ingest
- [x] [PM][SRE] Monorepo, environments (dev/staging/prod), CODEOWNERS, branch protections.
- [x] [SRE] CI/CD (lint/typecheck/unit/integration, Docker build, image scan/sign, deploy); secrets via KMS.
- [x] [SRE] Provision Postgres 16, Redis, NATS, S3/R2; VPC networking; TLS/HSTS/CSP; signed URLs.
- [x] [BE] NestJS API skeleton: OpenAPI 3.1, Zod, Problem+JSON, Casbin RBAC, Postgres RLS; Request‑ID & Idempotency‑Key.
- [x] [BE] DB migrations: projects, meetings, decisions, clauses, drafts, qa_pairs, exports, audit_log.
- [x] [NLP][BE] transcript‑worker: ingest transcripts (Zoom/Teams/Meet), minutes, notes; diarization & role tagging; language detect.
- [x] [FE] Upload flow + progress; TranscriptViewer with speaker turns; error states & retries.
- [x] [QA] Unit tests: diarization sampling, role tagging accuracy, RLS enforcement.

---

## Phase 2: Decision & Entity Extraction
- [x] [NLP][MLE] decision‑worker: obligation/deadline/approval/deliverable extraction; entities (parties, orgs, amounts, dates, governing law).
- [x] [MLE] Confidence scoring & span provenance; uncertainty highlighting; manual corrections API.
- [x] [BE] `GET /meetings/:id/decisions` & patch endpoints for human edits; SSE for extraction progress.
- [x] [FE] DecisionTable (editable rows, validation for dates/amounts/parties); governance law picker.
- [x] [QA] Integration tests: transcript → decisions; precision/recall baseline; latency benchmarks.

---

## Phase 3: Clause Library & Drafting Engine
- [x] [PM][BE] Seed open‑licensed clause sets; metadata (category, jurisdiction, source, risk flags); industry add‑on scaffolding.
- [x] [BE][MLE] Clause retrieval (keyword + semantic); jurisdiction/industry filters; variant selection.
- [x] [MLE] draft‑worker: assemble NDA/MoU/SoW/SLA; fill from decisions/entities; placeholder (TBD) tracking; deviation detector vs standards.
- [x] [FE] ContractEditor (TipTap/Slate): inline clause edits, tracked changes, deviations vs template; comparison view.
- [x] [QA] Golden set: decisions→draft mapping; placeholder coverage; deviation highlights.

---

## Phase 4: QA Assistant, Exports & Review Workflow
- [x] [MLE] qa‑worker: "why this clause", missing/risky clause detection, prep notes; cite sources (clause library + meeting spans).
- [x] [BE] APIs: `POST /qa`, `POST /drafts/generate`, `GET /drafts/:id`; versioning of drafts; export logs with encrypted metadata.
- [x] [BE] export‑worker: DOCX/PDF/Markdown/JSON; numbering, cross‑refs, TOC; watermark "Not legally binding until reviewed".
- [x] [FE] QAChat panel; ExportWizard; review roles (Owner/Editor/Reviewer/Viewer); assignment of clause approvals.
- [x] [QA] E2E: upload → decisions → draft → QA → export (PDF/DOCX/JSON); visual regression for DOCX/PDF.

---

## Phase 5: Observability, Security, Performance & GA
- [x] [SRE] OTel traces: meeting.parse, decision.extract, draft.make, qa.answer, export.render; Grafana dashboards; Sentry alerts.
- [x] [SRE] DLQ with backoff/jitter; autoscale workers; cache clause templates; incremental drafting.
- [x] [BE] Rate limits per org/IP; per‑tenant encryption keys; DSR/export/delete endpoints; comprehensive audit log surfacing.
- [x] [FE] Accessibility & i18n pass (keyboard nav, SR labels; multilingual drafts); legal disclaimers surfaces.
- [x] [QA][PM] Performance SLOs: parse 60‑min <30 s p95; draft gen <12 s p95; export <5 s p95; SSE/WS drop <0.5%; pilot feedback loop; GA checklist.

---

## Definition of Done
- [x] Passing E2E across NDA/MoU/SoW; all drafts embed provenance and placeholders; exports deterministic; SLOs met in staging; documentation & runbooks published.