# request-processing

## Purpose
Source-inspected baseline for krouter-app 0.5.166. Adoption records observable behavior and its limits, not new fleet guarantees.

## Requirements

### Requirement: Legacy analysis transformations and cache
The router SHALL retain its implemented advisory local intent/complexity classification, optional redaction and compression, and optional response cache. Redaction SHALL default to fail closed on covered enabled routes; the legacy explicit fail-open option and initial/disabled settings-read behavior remain limitations. This baseline SHALL NOT assert fleet analysis permission, universal redaction coverage, or policy-scoped cache provenance.

#### Scenario: Advisory classification
- **WHEN** the legacy chat handler reaches its classification block
- **THEN** it attempts local intent/complexity classification for diagnostics without changing user routing; classification failure does not reject the request.

#### Scenario: Enabled redaction service fails
- **WHEN** redaction is enabled on a covered request, the legacy fail-open option is disabled and the redaction service fails
- **THEN** the covered route rejects rather than forwarding unredacted content.

#### Scenario: Default response cache
- **WHEN** response caching has not been enabled
- **THEN** the router does not serve a response-cache hit.

## Evidence

Status: source inspected on 2026-10-31; listed regression candidates were not run during adoption.

Sources:
- `src/sse/handlers/chat.js`
- `src/middleware/redaction/`
- `src/lib/db/repos/settingsRepo.js`

Regression candidates:
- `tests/unit/response-cache-guards.test.js`
- `src/middleware/redaction/tests/integration.test.js`
