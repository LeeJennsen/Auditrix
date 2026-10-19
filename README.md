# AI-Powered Audit Lifecycle Platform (POC)

Automates Operations Governance ("CAFÉ") audits for closed ITSM tickets
(INC / SR / CR / PRB): ingests a closed ticket, evaluates it against mock SOPs
via an LLM, assigns a compliance score, and flags non-compliant tickets
for human QC.

## 1. Run locally (no Docker)

```bash
pip install -r requirements.txt

# Add the API keys you plan to use to .env, then start FastAPI
uvicorn main:app --reload --port 8000
```

Frontend: http://localhost:8000/ (redirects to the browser dashboard)
Docs UI: http://localhost:8000/docs

## 2. Run with Docker

```bash
# Build the image and start the container in the background
docker compose up --build -d

# View live container logs
docker compose logs -f
```

Audit runner for incoming tickets: http://localhost:8000/auditrix-prototype-main/#/audit-runner
Real-Time Monitor streams saved database records over WebSocket.

### Persistent audit history and live updates

Local runs use SQLite at `data/audit.sqlite3` by default. Docker Compose starts a
PostgreSQL service and stores its data in the named `postgres_data` volume. The
database contains audit tickets, recalculated score spreads, alerts, and saved
settings. Startup does not create fabricated audit history. If the older Compose
SQLite volume exists, its audit records and threshold are imported on startup.
Each audit row stores `policy_compliance`, `escalation_protocol`,
`tone_and_sentiment`, and `documentation_accuracy` as integer columns. The API
and WebSocket snapshot read those values from the row; a dimension with only
not-applicable criteria is returned as `null`.

The browser opens `/api/v1/ws` on the same port as the web app (`8000`). Saved
audits and reviews are broadcast to connected pages as database-backed snapshots.
When the stream or database is unavailable, the UI clears ticket data and shows
the connection as unavailable. It reconnects automatically; ticket records and
score dimensions are never supplied by a local demo bundle.

Keep the `postgres_data` volume to preserve current history. `docker compose down -v` removes the database volumes and permanently deletes their contents.

## 3. Test the webhook

### A compliant ticket (expected: high score, requires_human_qc = false)

```bash
curl -X POST http://localhost:8000/api/v1/tickets/webhook \
  -H "Content-Type: application/json" \
  -d @sample_payload.json
```

### A non-compliant ticket (expected: low score, requires_human_qc = true)

```bash
curl -X POST http://localhost:8000/api/v1/tickets/webhook \
  -H "Content-Type: application/json" \
  -d @sample_payload_noncompliant.json
```

### Example response shape

```json
{
  "audit_id": "3f1c...",
  "ticket_id": "INC0012345",
  "type": "INC",
  "closing_agent": "agent.rivera",
  "closed_at": "2025-01-15T14:35:00Z",
  "compliance_score": 96,
  "audit_reasoning": "Resolution notes explicitly state root cause, remediation steps, affected CI, and user confirmation, satisfying all SOP clauses.",
  "requires_human_qc": false,
  "compliance_threshold": 90,
  "llm_provider": "gemini",
  "llm_model": "gemini-3.5-flash-lite",
  "audited_at": "2026-09-23T14:35:02.104Z",
  "processing_time_ms": 812
}
```

## 4. Health check

```bash
curl http://localhost:8000/health
```

## Design notes

- **AI provider selection**: choose Gemini, Claude, or ChatGPT in the dashboard
  for each audit. Providers without a configured key are disabled. Set
  `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` in `.env`; the existing
  `GEMINI_API_KEY` remains supported. Restart the service after changing keys.
  For workspace-scoped Anthropic keys, also set `ANTHROPIC_WORKSPACE_ID`.
  Provider model IDs can be changed with `GEMINI_MODEL`, `ANTHROPIC_MODEL`,
  and `OPENAI_MODEL`. The default provider is controlled by `LLM_PROVIDER`.

- **Gemini performance**: the default model is `gemini-3.5-flash-lite`, using
  low thinking effort and structured JSON output. The Google SDK retries
  transient API failures with bounded backoff; after a 503, the service tries
  `gemini-3.8-flash`. Change `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`, or
  `GEMINI_THINKING_LEVEL` in `.env` to tune this behavior.
- **Ticket intake**: open `/auditrix-prototype-main/#/audit-runner` to submit a
  closed ticket, or POST incoming ticket data to `/api/v1/tickets/webhook`.
  Audits and their score dimensions are saved before the service broadcasts
  the updated database snapshot over WebSocket.
- **Procedural test traffic**: use the Run Audit page's **Generate 10 tickets**
  control or call `POST /api/v1/generate-tickets?count=10`. The generator scores
  each transcript with the configured AI provider when a key is available and
  records a randomized demo score when the provider is missing or fails. It
  bulk-commits each batch and broadcasts the updated snapshot. To keep generating
  batches from a terminal, run `python seed.py --continuous --count 10`.
- **Persistent storage**: successful audits, score distributions, alerts, and
  human review changes are written to the configured database. Set
  `DATABASE_URL` (for PostgreSQL, use `postgresql+psycopg://...`); without it,
  local runs use SQLite. `AUDIT_DB_PATH` changes the local SQLite file location.

- **Preprocessing**: `preprocess_ticket_text()` normalizes whitespace,
  strips control characters, redacts emails/phone numbers before they
  reach the LLM, and truncates oversized text to control token cost.
- **SOP library**: mock SOPs are inlined per ticket type
  (`SOP_LIBRARY` dict) so the LLM has a concrete rubric. In production
  these would be pulled from a governed, versioned SOP repository.
- **AI Evaluation Engine**: `evaluate_ticket_compliance()` builds a
  system prompt (SOP + rubric) and user prompt (cleaned ticket), calls
  the LLM, and strictly parses/validates the JSON response.
  LLM failures return a clear `HTTP 502` or `HTTP 503` rather than a silent bad score.
- **Mock LLM mode**: select **Demo (no API)** in the audit runner to use the
  deterministic heuristic scorer (`_call_mock_llm`) for local workflow checks.
- **Routing**: `determine_qc_routing()` implements the exception-based
  logic — anything below `COMPLIANCE_THRESHOLD` (default 80) is flagged
  `requires_human_qc = True`. The Scoring Rubric page can update this value;
  the setting is stored in SQLite and applies to future audits.
- **Validation**: malformed payloads are rejected automatically with
  `HTTP 422` by Pydantic before any business logic runs.

## What a production version would add

- Move from the local SQLite prototype to managed Postgres for multi-instance
  deployments, with a tamper-evident audit trail and immutable history.
- Async LLM calls + queue (SQS/Kafka) to decouple ingestion from audit latency.
- Auth (mTLS or signed webhook secret) on the ingestion endpoint.
- A QC reviewer UI/queue consuming `requires_human_qc = true` records.
- Prompt/version tracking for SOPs so audit outcomes are reproducible and auditable.
- Structured observability (score distribution, drift, auditor agreement metrics).
