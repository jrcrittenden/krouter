# session-affinity

## Purpose
Source-inspected baseline for krouter-app 0.5.166. Adoption records observable behavior and its limits, not new fleet guarantees.

## Requirements

### Requirement: Session fingerprints and affinity
The router SHALL maintain implemented conversation fingerprints, account affinity, and active-session tracking. These mechanisms SHALL NOT be described as durable authenticated fleet task/session identities or restart-safe policy and funding state.

#### Scenario: Conversation affinity
- **WHEN** a recognized conversation continues within the implemented affinity mechanism
- **THEN** the router can reuse its upstream session/account association without establishing durable fleet identity.

## Evidence

Status: source inspected on 2026-10-31; listed regression candidates were not run during adoption.

Sources:
- `open-sse/services/sessionManager.js`
- `open-sse/utils/sessionManager.js`

Regression candidates:
- `tests/unit/session-management.test.js`
