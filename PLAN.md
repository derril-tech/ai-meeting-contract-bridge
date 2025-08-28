# AI Meeting Contract Bridge — Delivery Plan (v0.1)
_Date: 2025-08-28 • Owner: PM/Tech Lead • Status: Draft_

## 0) One‑liner
**“Bridge meeting discussions to actionable contracts: auto‑generate draft agreements from decisions, tasks, and commitments.”**

## 1) Goals & Non‑Goals (V1)
**Goals**
- End‑to‑end pipeline from meeting ingest → decision/entity extraction → clause selection → contract draft → QA explanations → exports (DOCX/PDF/Markdown/JSON).
- Structured decision log (who/what/when/value) with traceable linkage into clauses.
- Clause library with open‑licensed, jurisdiction‑aware templates and risk flags.
- Editable contract viewer (inline edits, tracked placeholders), and Q&A with clause rationales.
- Secure tenancy (RLS), per‑tenant encryption, strong audit trail.

**Non‑Goals**
- Replacing professional legal review or providing legal advice.
- Full CLM (approvals/signature/workflow) — we export JSON to downstream CLMs.
- Negotiation redlining across counterparties (basic tracked edits only).

## 2) Scope
**In‑scope**
- Inputs: transcripts (Zoom/Teams/Meet), minutes, notes; diarization & role tagging.
- Extraction: decisions/obligations, deadlines, parties, monetary values, governing law.
- Drafting: NDA/MoU/SoW/SLA/project agreements via clause library + contextual fill.
- Compliance: jurisdiction variants (US/UK/EU/APAC), industry add‑ons (SaaS/health/finance).
- QA & coaching: “why this clause?”, missing/risky clause flags, prep notes.
- Exports: DOCX/PDF/Markdown and JSON bundle (decisions, clauses, draft, QA).

**Out‑of‑scope**
- eSignature, payments, DMS/CRM integrations (future connectors).
- Litigation/precedent search or case‑law reasoning.

## 3) Workstreams & Success Criteria
1. **Ingest & Decisions** — ✅ Accurate transcript parse + decision/entity extraction.
2. **Clause Library** — ✅ Curated open‑licensed templates with jurisdiction toggles.
3. **Drafting Engine** — ✅ High‑coverage mapping decisions→clauses; placeholder tracking.
4. **QA & Editor** — ✅ Useful explanations; inline edits; risk highlights.
5. **Exports & Governance** — ✅ Clean DOCX/PDF/MD/JSON; versioning; audit; SLOs met.

## 4) Milestones (~8–10 weeks)
- **Weeks 1–2**: Infra, schema, uploads; transcript parsing + diarization baseline.
- **Weeks 3–4**: Decision/entity extraction; clause library MVP; contract viewer shell.
- **Weeks 5–6**: Drafting engine (fill/variants/placeholders); QA assistant; risk flags.
- **Weeks 7–8**: Exports (DOCX/PDF/MD/JSON); comparison view vs standard; governance & audit UI.
- **Weeks 9–10**: Performance, security hardening, E2E tests; pilot and polish.

## 5) Deliverables
- OpenAPI 3.1 spec + TS SDK & Postman collection.
- Clause library (open‑licensed) with jurisdictional variants + metadata.
- Golden test set: annotated transcripts → expected decisions & drafts.
- Export templates (DOCX styles, PDF layout, Markdown theme).
- Playwright E2E; OTel dashboards; runbooks; DSR procedures.

## 6) Risks & Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Ambiguous meeting language → wrong obligations | High | Confidence bands; human‑in‑the‑loop edits; highlight uncertain spans |
| Clause misuse across jurisdictions | High | Jurisdiction gate; variant selectors; method cards & warnings |
| Hallucinated fills in drafts | High | Evidence‑first prompts; require decision/party refs or mark as TBD |
| OCR/ASR quality limits | Medium | Use high‑accuracy ASR; allow manual notes; re‑ingest corrections |
| Export fidelity (fonts/numbering) | Medium | Deterministic templates; export preflight checks; visual tests |

## 7) Acceptance Criteria (V1)
- Transcript parse (60‑min meeting) **< 30 s p95**; draft generation (≈5 pages) **< 12 s p95**; export DOCX/PDF **< 5 s p95**.
- Decision→clause coverage **≥ 90%** on golden set; placeholders flagged for all unresolved fields.
- Lawyer acceptance (minor edits only) **≥ 70%** in pilot review.
- All explanations cite clause sources and/or meeting spans.
- Every draft stamped “Not legally binding until reviewed”.

## 8) Rollout
- Private pilot (5–10 teams) across 3 contract types (NDA/MoU/SoW).
- Feature flags: SLA + industry add‑ons; multilingual drafts.
- GA with SOC‑style security summary, export templates, and docs.