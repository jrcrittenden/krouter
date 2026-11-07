# provider-connections

## Purpose
Source-inspected baseline for krouter-app 0.5.166. Adoption records observable behavior and its limits, not new fleet guarantees.

## Requirements

### Requirement: Provider connections and credential refresh
The router SHALL support implemented API-key, OAuth, and compatible-provider connections and invoke supported credential refresh paths when required. Standard Venice API-key chat and model discovery SHALL be treated as HTTPS/Bearer integration, without an E2EE guarantee.

#### Scenario: Expired supported OAuth credentials
- **WHEN** a supported upstream rejects expired credentials and refresh succeeds
- **THEN** the router can retry with refreshed credentials.

#### Scenario: Standard Venice connection
- **WHEN** a standard Venice API-key connection is used
- **THEN** requests use the configured HTTPS endpoint; model discovery alone does not establish payload encryption or attestation.

## Evidence

Status: source inspected on 2026-10-31; listed regression candidates were not run during adoption.

Sources:
- `src/lib/oauth/`
- `src/app/api/providers/route.js`
- `open-sse/services/oauthCredentialManager.js`
- `open-sse/handlers/chatCore.js`
- `src/shared/constants/liveFetch.js`
- `open-sse/config/providers.js`

Regression candidates:
- `tests/unit/compatible-provider-connections.test.js`
- `tests/unit/new-provider-routing.test.js`
